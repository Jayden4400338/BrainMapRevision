-- Seed Data for BrainMapRevision
-- Run this FIFTH (after schema is created)

-- ============================================
-- INSERT SUBJECTS
-- ============================================
INSERT INTO subjects (name, slug, icon, description, year_groups) VALUES
('English', 'english', 'book', 'English Language and Literature for all year groups', ARRAY['Year 1-6', 'Year 7-9', 'Year 10-11']),
('Mathematics', 'mathematics', 'calculator', 'Mathematics from basic arithmetic to GCSE', ARRAY['Year 1-6', 'Year 7-9', 'Year 10-11']),
('Science', 'science', 'flask', 'Biology, Chemistry, and Physics', ARRAY['Year 1-6', 'Year 7-9', 'Year 10-11']),
('History', 'history', 'scroll', 'British and World History', ARRAY['Year 7-9', 'Year 10-11']),
('Geography', 'geography', 'globe', 'Physical and Human Geography', ARRAY['Year 7-9', 'Year 10-11']),
('Computer Science', 'computer-science', 'laptop', 'Computing and Programming', ARRAY['Year 7-9', 'Year 10-11']),
('Art & Design', 'art', 'palette', 'Art, Design and Visual Arts', ARRAY['Year 1-6', 'Year 7-9', 'Year 10-11']),
('Languages', 'languages', 'language', 'French, Spanish, German and more', ARRAY['Year 7-9', 'Year 10-11']);

-- ============================================
-- INSERT SHOP ITEMS
-- ============================================

-- Themes
INSERT INTO shop_items (name, description, category, price, min_level, properties) VALUES
('Ocean Wave Theme', 'Calm blue and teal gradients inspired by the ocean', 'theme', 200, 1, '{"colors": {"primary": "#0EA5E9", "secondary": "#06B6D4"}}'),
('Forest Sanctuary Theme', 'Natural green and earth tones', 'theme', 250, 1, '{"colors": {"primary": "#10B981", "secondary": "#34D399"}}'),
('Sunset Blaze Theme', 'Warm orange, pink and purple gradients', 'theme', 300, 1, '{"colors": {"primary": "#F59E0B", "secondary": "#EC4899"}}'),
('Neon Nights Theme', 'Vibrant neon colors for late night studying', 'theme', 350, 5, '{"colors": {"primary": "#8B5CF6", "secondary": "#EC4899"}}'),
('Retro Arcade Theme', 'Classic 8-bit style design', 'theme', 400, 10, '{"colors": {"primary": "#EF4444", "secondary": "#F59E0B"}}'),
('Galaxy Theme', 'Deep space with stars and nebulae', 'theme', 500, 15, '{"colors": {"primary": "#6366F1", "secondary": "#8B5CF6"}}'),
('Custom Theme Creator', 'Unlock the ability to create your own themes', 'theme', 1000, 5, '{"type": "creator"}');

-- Hint Packs
INSERT INTO shop_items (name, description, category, price, min_level, properties) VALUES
('5 Hint Pack', 'Get 5 quiz hints', 'hint_pack', 50, 1, '{"hints": 5}'),
('10 Hint Pack', 'Get 10 quiz hints (10% discount)', 'hint_pack', 90, 1, '{"hints": 10}'),
('25 Hint Pack', 'Get 25 quiz hints (20% discount)', 'hint_pack', 200, 1, '{"hints": 25}'),
('Unlimited Hints (1 Week)', 'Unlimited quiz hints for 7 days', 'hint_pack', 500, 5, '{"hints": -1, "duration": 7}');

-- Power-Ups
INSERT INTO shop_items (name, description, category, price, min_level, properties) VALUES
('2x XP Boost (1 Hour)', 'Double XP for all activities for 1 hour', 'power_up', 100, 1, '{"multiplier": 2, "duration": 60}'),
('Time Freeze', 'Pause quiz timer for one question', 'power_up', 75, 1, '{"type": "time_freeze", "uses": 1}'),
('Second Chance', 'Retry a wrong answer once', 'power_up', 60, 1, '{"type": "second_chance", "uses": 1}'),
('Skip Question', 'Skip one difficult question', 'power_up', 50, 1, '{"type": "skip", "uses": 1}');

-- Cosmetics
INSERT INTO shop_items (name, description, category, price, min_level, properties) VALUES
('Animated Avatar: Book', 'Animated book avatar', 'cosmetic', 150, 1, '{"type": "avatar", "animation": "book"}'),
('Animated Avatar: Brain', 'Animated brain avatar', 'cosmetic', 200, 5, '{"type": "avatar", "animation": "brain"}'),
('Animated Avatar: Star', 'Animated star avatar', 'cosmetic', 250, 10, '{"type": "avatar", "animation": "star"}'),
('Profile Border: Gold', 'Golden profile border', 'cosmetic', 100, 1, '{"type": "border", "color": "gold"}'),
('Profile Border: Rainbow', 'Rainbow animated border', 'cosmetic', 150, 15, '{"type": "border", "color": "rainbow"}'),
('Custom Badge: Scholar', 'Scholar achievement badge', 'cosmetic', 100, 10, '{"type": "badge", "name": "scholar"}'),
('Username Color: Purple', 'Purple username color', 'cosmetic', 125, 5, '{"type": "username_color", "color": "#A78BFA"}');

-- ============================================
-- INSERT ACHIEVEMENTS
-- ============================================
INSERT INTO achievements (name, description, icon, xp_reward, coin_reward, requirement_type, requirement_value) VALUES
('First Steps', 'Complete your first quiz', '🎓', 100, 25, 'quiz_count', 1),
('Quiz Master', 'Complete 10 quizzes', '📝', 250, 75, 'quiz_count', 10),
('Perfect Score', 'Get 100% on a quiz', '⭐', 150, 50, 'perfect_score', 1),
('Week Warrior', 'Maintain a 7-day study streak', '🔥', 200, 100, 'streak', 7),
('Century Club', 'Answer 100 questions correctly', '💯', 300, 125, 'correct_answers', 100),
('Subject Master', 'Reach 90% mastery in a subject', '🏆', 500, 200, 'subject_mastery', 90),
('Helpful Hand', 'Help 10 other students in the community', '🤝', 200, 75, 'help_count', 10),
('Contribution Champion', 'Submit 5 accepted past paper questions', '📚', 250, 100, 'contribution_count', 5);

-- ============================================
-- INSERT SAMPLE QUIZ QUESTIONS
-- ============================================

DO $$
DECLARE
    math_id INTEGER;
    english_id INTEGER;
    science_id INTEGER;
BEGIN
    SELECT id INTO math_id FROM subjects WHERE slug = 'mathematics';
    SELECT id INTO english_id FROM subjects WHERE slug = 'english';
    SELECT id INTO science_id FROM subjects WHERE slug = 'science';

    -- Mathematics Questions
    INSERT INTO quiz_questions (subject_id, topic, question, question_type, options, correct_answer, explanation, difficulty) VALUES
    (math_id, 'Algebra', 'What is the value of x in the equation 2x + 5 = 15?', 'multiple_choice', 
     '["3", "5", "10", "7"]', '5', 'Subtract 5 from both sides: 2x = 10, then divide by 2: x = 5', 'easy'),
    
    (math_id, 'Geometry', 'What is the area of a circle with radius 4cm? (Use π = 3.14)', 'multiple_choice',
     '["12.56 cm²", "25.12 cm²", "50.24 cm²", "100.48 cm²"]', '50.24 cm²', 'Use the formula A = πr². A = 3.14 × 4² = 3.14 × 16 = 50.24 cm²', 'medium'),
    
    (math_id, 'Pythagoras', 'What is the hypotenuse of a right triangle with sides 3cm and 4cm?', 'multiple_choice',
     '["5 cm", "6 cm", "7 cm", "8 cm"]', '5 cm', 'Use a² + b² = c². 3² + 4² = 9 + 16 = 25, so c = √25 = 5', 'medium');

    -- English Questions
    INSERT INTO quiz_questions (subject_id, topic, question, question_type, options, correct_answer, explanation, difficulty) VALUES
    (english_id, 'Grammar', 'Which word is the verb in this sentence: "The cat sleeps on the mat"?', 'multiple_choice',
     '["cat", "sleeps", "mat", "the"]', 'sleeps', 'A verb is an action or state word. "Sleeps" is the action in this sentence.', 'easy'),
    
    (english_id, 'Shakespeare', 'Who wrote "Romeo and Juliet"?', 'multiple_choice',
     '["Charles Dickens", "William Shakespeare", "Jane Austen", "J.K. Rowling"]', 'William Shakespeare', 'William Shakespeare wrote Romeo and Juliet in the 1590s.', 'easy'),
    
    (english_id, 'Literary Devices', 'What literary device is used in "The wind whispered through the trees"?', 'multiple_choice',
     '["Simile", "Metaphor", "Personification", "Alliteration"]', 'Personification', 'Personification gives human qualities (whispering) to non-human things (wind).', 'medium');

    -- Science Questions
    INSERT INTO quiz_questions (subject_id, topic, question, question_type, options, correct_answer, explanation, difficulty) VALUES
    (science_id, 'Biology - Cells', 'What is the powerhouse of the cell?', 'multiple_choice',
     '["Nucleus", "Mitochondria", "Ribosome", "Chloroplast"]', 'Mitochondria', 'Mitochondria produce energy (ATP) through cellular respiration.', 'easy'),
    
    (science_id, 'Chemistry - Periodic Table', 'What is the chemical symbol for Gold?', 'multiple_choice',
     '["Go", "Au", "Gd", "Ag"]', 'Au', 'Gold''s symbol Au comes from its Latin name "Aurum".', 'medium'),
    
    (science_id, 'Physics - Forces', 'What is Newton''s First Law of Motion?', 'multiple_choice',
     '["F = ma", "An object at rest stays at rest unless acted upon", "For every action there is an equal and opposite reaction", "E = mc²"]', 
     'An object at rest stays at rest unless acted upon', 'Newton''s First Law states that objects remain in their state of motion unless a force acts on them.', 'medium');

END $$;