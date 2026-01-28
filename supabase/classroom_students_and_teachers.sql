-- ============================================
-- CLASSROOM: Students list with profiles, remove student, teachers cannot join
-- ============================================
-- Run this in Supabase SQL Editor after fix_classroom_join.sql / classroom_setup

-- Ensure users has profile_picture_url (if migration not run)
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500);

-- 1) Teachers can get students in their classroom with profile data
--    (RLS on users blocks teachers from SELECT on users; this RPC bypasses for classroom students only)
CREATE OR REPLACE FUNCTION get_classroom_students_with_profiles(
    p_classroom_id INTEGER,
    p_teacher_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    student_id UUID,
    username VARCHAR(50),
    email VARCHAR(255),
    year_group VARCHAR(20),
    profile_picture_url VARCHAR(500),
    joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Only return rows if caller is the teacher of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM classrooms c
        WHERE c.id = p_classroom_id AND c.teacher_id = p_teacher_id
    ) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        u.id AS student_id,
        u.username,
        u.email,
        u.year_group,
        u.profile_picture_url,
        cs.joined_at
    FROM classroom_students cs
    JOIN users u ON u.id = cs.student_id
    WHERE cs.classroom_id = p_classroom_id
    ORDER BY cs.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_classroom_students_with_profiles(INTEGER, UUID) TO authenticated;

-- 2) Teacher can remove a student from their classroom
CREATE OR REPLACE FUNCTION remove_student_from_classroom(
    p_classroom_id INTEGER,
    p_student_id UUID,
    p_teacher_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM classrooms c
        WHERE c.id = p_classroom_id AND c.teacher_id = p_teacher_id
    ) THEN
        RETURN QUERY SELECT FALSE, 'You are not the teacher of this classroom'::TEXT;
        RETURN;
    END IF;

    DELETE FROM classroom_students
    WHERE classroom_id = p_classroom_id AND student_id = p_student_id;

    IF FOUND THEN
        RETURN QUERY SELECT TRUE, 'Student removed from classroom'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'Student was not in this classroom'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION remove_student_from_classroom(INTEGER, UUID, UUID) TO authenticated;

-- 3) join_classroom_by_code: only students may join (teachers cannot join classrooms)
CREATE OR REPLACE FUNCTION join_classroom_by_code(
    p_student_id UUID,
    p_invite_code VARCHAR(10)
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    classroom_id INTEGER,
    classroom_name VARCHAR(200)
) AS $$
DECLARE
    v_classroom_id INTEGER;
    v_classroom_name VARCHAR(200);
    v_user_role VARCHAR(20);
    v_already_joined BOOLEAN;
BEGIN
    SELECT role INTO v_user_role
    FROM users
    WHERE id = p_student_id;

    IF v_user_role IS NULL THEN
        RETURN QUERY SELECT FALSE, 'User not found'::TEXT, NULL::INTEGER, NULL::VARCHAR(200);
        RETURN;
    END IF;

    -- Only students can join classrooms
    IF v_user_role != 'student' THEN
        RETURN QUERY SELECT FALSE, 'Only students can join classrooms. Teachers create and manage their own.'::TEXT, NULL::INTEGER, NULL::VARCHAR(200);
        RETURN;
    END IF;

    SELECT id, name INTO v_classroom_id, v_classroom_name
    FROM get_classroom_by_invite_code(p_invite_code);

    IF v_classroom_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Invalid invite code'::TEXT, NULL::INTEGER, NULL::VARCHAR(200);
        RETURN;
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM classroom_students
        WHERE classroom_id = v_classroom_id AND student_id = p_student_id
    ) INTO v_already_joined;

    IF v_already_joined THEN
        RETURN QUERY SELECT FALSE, 'Already a member of this classroom'::TEXT, v_classroom_id, v_classroom_name;
        RETURN;
    END IF;

    INSERT INTO classroom_students (classroom_id, student_id)
    VALUES (v_classroom_id, p_student_id)
    ON CONFLICT (classroom_id, student_id) DO NOTHING;

    RETURN QUERY SELECT TRUE, 'Successfully joined classroom'::TEXT, v_classroom_id, v_classroom_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION join_classroom_by_code TO authenticated;

-- 4) Teacher can create an assignment for their classroom
-- Required params first; any param after one with DEFAULT must also have DEFAULT
CREATE OR REPLACE FUNCTION create_assignment(
    p_classroom_id INTEGER,
    p_title VARCHAR(200),
    p_description TEXT DEFAULT NULL,
    p_due_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_content_type VARCHAR(50) DEFAULT NULL,
    p_content_id INTEGER DEFAULT NULL,
    p_teacher_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    id INTEGER,
    classroom_id INTEGER,
    title VARCHAR(200),
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_id INTEGER;
BEGIN
    IF p_title IS NULL OR TRIM(p_title) = '' THEN
        RAISE EXCEPTION 'Assignment title is required';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM classrooms c
        WHERE c.id = p_classroom_id AND c.teacher_id = p_teacher_id
    ) THEN
        RAISE EXCEPTION 'You are not the teacher of this classroom';
    END IF;

    INSERT INTO assignments (classroom_id, title, description, content_type, content_id, due_date)
    VALUES (
        p_classroom_id,
        TRIM(p_title),
        NULLIF(TRIM(p_description), ''),
        p_content_type,
        p_content_id,
        p_due_date
    )
    RETURNING assignments.id INTO v_id;

    RETURN QUERY
    SELECT
        a.id,
        a.classroom_id,
        a.title,
        a.description,
        a.due_date,
        a.created_at
    FROM assignments a
    WHERE a.id = v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_assignment(INTEGER, VARCHAR(200), TEXT, TIMESTAMP WITH TIME ZONE, VARCHAR(50), INTEGER, UUID) TO authenticated;

-- 5) Teachers must be able to SELECT assignments in their classrooms (so the list shows after create)
DROP POLICY IF EXISTS "Teachers can view assignments in their classrooms" ON assignments;
CREATE POLICY "Teachers can view assignments in their classrooms" ON assignments
    FOR SELECT USING (
        classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())
    );

-- 6) Teachers can delete assignments in their classrooms
CREATE OR REPLACE FUNCTION delete_assignment(
    p_assignment_id INTEGER,
    p_teacher_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM assignments a
        JOIN classrooms c ON c.id = a.classroom_id
        WHERE a.id = p_assignment_id AND c.teacher_id = p_teacher_id
    ) THEN
        RETURN QUERY SELECT FALSE, 'You cannot delete this assignment'::TEXT;
        RETURN;
    END IF;
    DELETE FROM assignments WHERE id = p_assignment_id;
    RETURN QUERY SELECT TRUE, 'Assignment deleted'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION delete_assignment(INTEGER, UUID) TO authenticated;

-- 7) Assignment resources: link assignments to subjects, revision guides, past papers, flashcards, revision boards, or external URLs
CREATE TABLE IF NOT EXISTS assignment_resources (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    kind VARCHAR(30) NOT NULL CHECK (kind IN ('subject', 'revision_guide', 'past_papers', 'revision_board', 'flashcards', 'link', 'quiz')),
    ref_id INTEGER,           -- subject_id, revision_guide.id, revision_boards.id, etc.
    ref_extra VARCHAR(100),   -- e.g. exam_board for past_papers
    url VARCHAR(1000),        -- for kind='link'
    label VARCHAR(300),       -- display label; for link=title, for past_papers e.g. "AQA Year 11"
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_resources_assignment ON assignment_resources(assignment_id);

ALTER TABLE assignment_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers manage assignment resources" ON assignment_resources;
CREATE POLICY "Teachers manage assignment resources" ON assignment_resources
    FOR ALL
    USING (
        assignment_id IN (
            SELECT id FROM assignments WHERE classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())
        )
    )
    WITH CHECK (
        assignment_id IN (
            SELECT id FROM assignments WHERE classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Students view assignment resources" ON assignment_resources;
CREATE POLICY "Students view assignment resources" ON assignment_resources
    FOR SELECT USING (
        assignment_id IN (
            SELECT id FROM assignments WHERE classroom_id IN (SELECT classroom_id FROM classroom_students WHERE student_id = auth.uid())
        )
    );
