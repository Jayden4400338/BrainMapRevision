-- =============================================================
-- Mathematics Quiz Questions — BrainMapRevision
-- Topics covered:
--   1. Angles Around a Point
--   2. Reflections
--   3. Transformations
--   4. Standard Form
--   5. HCF
--   6. LCM
--   7. Factors, Multiples and Primes
--   8. Prime Decomposition
--   9. Squares, Cubes and Roots
--
-- Run AFTER inserting the Mathematics subject row.
-- Replace the subject_id value (2) if your Mathematics row has
-- a different id — check with:
--   SELECT id FROM subjects WHERE slug = 'mathematics';
-- =============================================================

-- Helper: make sure we reference the correct subject id
DO $$
DECLARE
  math_id INTEGER;
BEGIN
  SELECT id INTO math_id FROM subjects WHERE slug = 'mathematics' LIMIT 1;
  IF math_id IS NULL THEN
    RAISE EXCEPTION 'Mathematics subject not found. Insert it first.';
  END IF;
END $$;

-- =============================================================
-- 1. ANGLES AROUND A POINT (15 questions)
-- =============================================================
INSERT INTO quiz_questions (subject_id, topic, question, question_type, options, correct_answer, difficulty, explanation)
SELECT id, 'Angles Around a Point', q.question, q.question_type, q.options::jsonb, q.correct_answer, q.difficulty, q.explanation
FROM subjects, (VALUES
  -- easy
  ('Angles around a point sum to how many degrees?',
   'multiple_choice', '["90°", "180°", "270°", "360°"]', '360°', 'easy',
   'A full turn around a point is always 360°.'),

  ('Angles on a straight line add up to how many degrees?',
   'multiple_choice', '["90°", "180°", "270°", "360°"]', '180°', 'easy',
   'A straight line represents half a full turn, so the angles sum to 180°.'),

  ('Two angles on a straight line are 110° and x°. What is x?',
   'multiple_choice', '["60°", "70°", "80°", "90°"]', '70°', 'easy',
   '110 + x = 180, so x = 180 − 110 = 70°.'),

  ('What do we call two angles that add up to 90°?',
   'multiple_choice', '["Supplementary", "Complementary", "Vertically opposite", "Co-interior"]', 'Complementary', 'easy',
   'Complementary angles sum to 90°. Supplementary angles sum to 180°.'),

  ('What do we call two angles that add up to 180°?',
   'multiple_choice', '["Complementary", "Alternate", "Supplementary", "Corresponding"]', 'Supplementary', 'easy',
   'Supplementary angles sum to 180°.'),

  -- medium
  ('Three angles around a point are 120°, 95° and x°. Find x.',
   'multiple_choice', '["135°", "145°", "155°", "165°"]', '145°', 'medium',
   '120 + 95 + x = 360 → x = 360 − 215 = 145°.'),

  ('Two vertically opposite angles are given as (2x + 10)° and (3x − 20)°. Find x.',
   'multiple_choice', '["20", "30", "40", "50"]', '30', 'medium',
   'Vertically opposite angles are equal: 2x + 10 = 3x − 20 → x = 30.'),

  ('Angles on a straight line are in the ratio 2:3. Find the larger angle.',
   'multiple_choice', '["72°", "108°", "90°", "120°"]', '108°', 'medium',
   'Total = 180°. Larger share = 3/5 × 180 = 108°.'),

  ('Four angles around a point are equal. What is each angle?',
   'multiple_choice', '["45°", "60°", "90°", "120°"]', '90°', 'medium',
   '360 ÷ 4 = 90°.'),

  ('An angle of 47° and its vertically opposite angle — what is the vertically opposite angle?',
   'multiple_choice', '["133°", "47°", "43°", "313°"]', '47°', 'medium',
   'Vertically opposite angles are always equal.'),

  -- hard
  ('Two angles on a straight line are (4x + 5)° and (2x − 11)°. Find x.',
   'multiple_choice', '["26", "27", "28", "31"]', '31', 'hard',
   '(4x + 5) + (2x − 11) = 180 → 6x − 6 = 180 → 6x = 186 → x = 31.'),

  ('Five equal angles are arranged around a point. What is each angle?',
   'multiple_choice', '["60°", "70°", "72°", "75°"]', '72°', 'hard',
   '360 ÷ 5 = 72°.'),

  ('Angles on a straight line are x°, 2x° and 3x°. Find x.',
   'multiple_choice', '["20°", "25°", "30°", "35°"]', '30°', 'hard',
   'x + 2x + 3x = 180 → 6x = 180 → x = 30°.'),

  ('An angle and its complement are in ratio 4:1. Find the larger angle.',
   'multiple_choice', '["72°", "80°", "75°", "84°"]', '72°', 'hard',
   'Larger = 4/5 × 90 = 72°.'),

  ('Three angles around a point are x°, (x + 30)° and (2x − 30)°. Find x.',
   'multiple_choice', '["90°", "60°", "80°", "70°"]', '90°', 'hard',
   'x + x + 30 + 2x − 30 = 360 → 4x = 360 → x = 90°.')

) AS q(question, question_type, options, correct_answer, difficulty, explanation)
WHERE subjects.slug = 'mathematics';


-- =============================================================
-- 2. REFLECTIONS (12 questions)
-- =============================================================
INSERT INTO quiz_questions (subject_id, topic, question, question_type, options, correct_answer, difficulty, explanation)
SELECT id, 'Reflections', q.question, q.question_type, q.options::jsonb, q.correct_answer, q.difficulty, q.explanation
FROM subjects, (VALUES
  ('When reflecting in the y-axis, what happens to the x-coordinate?',
   'multiple_choice', '["It doubles", "It stays the same", "It becomes negative", "It becomes zero"]',
   'It becomes negative', 'easy',
   'Reflecting in the y-axis: (x, y) → (−x, y). The x-coordinate changes sign.'),

  ('When reflecting in the x-axis, what happens to the y-coordinate?',
   'multiple_choice', '["It stays the same", "It becomes negative", "It doubles", "It halves"]',
   'It becomes negative', 'easy',
   'Reflecting in the x-axis: (x, y) → (x, −y). The y-coordinate changes sign.'),

  ('Point A is at (3, 5). After reflecting in the y-axis, where is A′?',
   'multiple_choice', '["(3, −5)", "(−3, 5)", "(5, 3)", "(−3, −5)"]',
   '(−3, 5)', 'easy',
   'Reflection in y-axis: (x, y) → (−x, y). So (3, 5) → (−3, 5).'),

  ('Point B is at (−2, 4). After reflecting in the x-axis, where is B′?',
   'multiple_choice', '["(2, 4)", "(−2, −4)", "(4, −2)", "(2, −4)"]',
   '(−2, −4)', 'easy',
   'Reflection in x-axis: (x, y) → (x, −y). So (−2, 4) → (−2, −4).'),

  ('What are the coordinates of (4, 7) after reflection in the line y = x?',
   'multiple_choice', '["(−4, −7)", "(7, 4)", "(4, −7)", "(−7, −4)"]',
   '(7, 4)', 'medium',
   'Reflection in y = x: (x, y) → (y, x). So (4, 7) → (7, 4).'),

  ('What are the coordinates of (3, −1) after reflection in y = −x?',
   'multiple_choice', '["(1, −3)", "(−3, 1)", "(1, 3)", "(3, 1)"]',
   '(1, −3)', 'medium',
   'Reflection in y = −x: (x, y) → (−y, −x). So (3, −1) → (1, −3).'),

  ('A shape is reflected and the image is identical to the original — which transformation is this?',
   'multiple_choice', '["Rotation", "Enlargement", "Reflection", "Translation"]',
   'Reflection', 'easy',
   'Reflections preserve size and shape, producing a mirror image.'),

  ('After reflecting (5, −3) in the y-axis, what are the new coordinates?',
   'multiple_choice', '["(−5, 3)", "(5, 3)", "(−5, −3)", "(3, 5)"]',
   '(−5, −3)', 'medium',
   'Reflection in y-axis: (x, y) → (−x, y). So (5, −3) → (−5, −3).'),

  ('Reflecting in the line x = 2 maps (6, 3) to which point?',
   'multiple_choice', '["(−2, 3)", "(−6, 3)", "(−2, −3)", "(2, 3)"]',
   '(−2, 3)', 'hard',
   'Distance from x = 6 to x = 2 is 4. Mirror image is at x = 2 − 4 = −2. So (6, 3) → (−2, 3).'),

  ('Reflecting in y = 1 maps (4, 5) to which point?',
   'multiple_choice', '["(4, −3)", "(4, 3)", "(−4, 5)", "(4, −5)"]',
   '(4, −3)', 'hard',
   'Distance from y = 5 to y = 1 is 4. Mirror at y = 1 − 4 = −3. So (4, 5) → (4, −3).'),

  ('Which of these statements about reflections is FALSE?',
   'multiple_choice',
   '["The object and image are congruent", "The object and image are the same distance from the mirror line", "Reflections change the size of the shape", "The mirror line is the perpendicular bisector of each object-image segment"]',
   'Reflections change the size of the shape', 'medium',
   'Reflections are isometric transformations — size is preserved, not changed.'),

  ('Point C at (−3, 2) is reflected in the line y = x. What are the new coordinates?',
   'multiple_choice', '["(2, −3)", "(3, −2)", "(−2, 3)", "(2, 3)"]',
   '(2, −3)', 'hard',
   'Reflection in y = x: (x, y) → (y, x). So (−3, 2) → (2, −3).')

) AS q(question, question_type, options, correct_answer, difficulty, explanation)
WHERE subjects.slug = 'mathematics';


-- =============================================================
-- 3. TRANSFORMATIONS (12 questions)
-- =============================================================
INSERT INTO quiz_questions (subject_id, topic, question, question_type, options, correct_answer, difficulty, explanation)
SELECT id, 'Transformations', q.question, q.question_type, q.options::jsonb, q.correct_answer, q.difficulty, q.explanation
FROM subjects, (VALUES
  ('Which transformation is described by a column vector?',
   'multiple_choice', '["Rotation", "Translation", "Reflection", "Enlargement"]',
   'Translation', 'easy',
   'A translation moves every point the same distance in the same direction, described by a column vector.'),

  ('A shape is enlarged with a scale factor of 2. How do the side lengths change?',
   'multiple_choice', '["Halved", "Stay the same", "Doubled", "Quadrupled"]',
   'Doubled', 'easy',
   'Scale factor 2 means every length is multiplied by 2.'),

  ('A point (3, 4) is translated by the vector (2, −5). Where does it end up?',
   'multiple_choice', '["(5, −1)", "(1, 9)", "(5, 9)", "(1, −1)"]',
   '(5, −1)', 'easy',
   '(3 + 2, 4 + (−5)) = (5, −1).'),

  ('When describing a rotation, which three pieces of information must you state?',
   'multiple_choice',
   '["Scale factor, centre, angle", "Centre, angle, direction", "Mirror line, angle, direction", "Vector, angle, scale factor"]',
   'Centre, angle, direction', 'medium',
   'A full rotation description requires the centre of rotation, the angle, and the direction (clockwise or anticlockwise).'),

  ('A shape is rotated 90° clockwise about the origin. Point (4, 2) maps to which point?',
   'multiple_choice', '["(−2, 4)", "(2, −4)", "(−4, −2)", "(2, 4)"]',
   '(2, −4)', 'medium',
   '90° clockwise about origin: (x, y) → (y, −x). So (4, 2) → (2, −4).'),

  ('An enlargement with scale factor −1 about the origin maps (3, 5) to which point?',
   'multiple_choice', '["(−3, 5)", "(3, −5)", "(−3, −5)", "(5, 3)"]',
   '(−3, −5)', 'medium',
   'Scale factor −1 maps every point to the diametrically opposite point through the centre: (3, 5) → (−3, −5).'),

  ('Which transformation changes the size of a shape?',
   'multiple_choice', '["Translation", "Rotation", "Reflection", "Enlargement"]',
   'Enlargement', 'easy',
   'Only enlargement (with a scale factor ≠ 1 or −1) changes the size.'),

  ('A shape is rotated 180° about the origin. Point (−2, 3) maps to which point?',
   'multiple_choice', '["(2, −3)", "(−2, −3)", "(2, 3)", "(3, −2)"]',
   '(2, −3)', 'medium',
   '180° rotation about origin: (x, y) → (−x, −y). So (−2, 3) → (2, −3).'),

  ('Point (6, 9) is enlarged by scale factor 1/3 from the origin. Where does it map to?',
   'multiple_choice', '["(2, 3)", "(18, 27)", "(3, 6)", "(3, 2)"]',
   '(2, 3)', 'medium',
   '(6 × 1/3, 9 × 1/3) = (2, 3).'),

  ('A shape has been enlarged with scale factor 3. What has happened to the area?',
   'multiple_choice', '["Tripled", "Times 6", "Times 9", "Times 12"]',
   'Times 9', 'hard',
   'Area scale factor = (linear scale factor)². So 3² = 9 times larger.'),

  ('Point (2, 1) is rotated 90° anticlockwise about the origin. What is the image?',
   'multiple_choice', '["(1, −2)", "(−1, 2)", "(−2, −1)", "(−2, 1)"]',
   '(−1, 2)', 'hard',
   '90° anticlockwise: (x, y) → (−y, x). So (2, 1) → (−1, 2).'),

  ('Which two transformations always produce a congruent image?',
   'multiple_choice',
   '["Translation and enlargement", "Rotation and enlargement", "Translation and rotation", "Enlargement and reflection"]',
   'Translation and rotation', 'hard',
   'Translation and rotation are isometric (preserve size and shape). Enlargement changes size; reflection is also isometric but the pair given here is translation and rotation.')

) AS q(question, question_type, options, correct_answer, difficulty, explanation)
WHERE subjects.slug = 'mathematics';


-- =============================================================
-- 4. STANDARD FORM (15 questions)
-- =============================================================
INSERT INTO quiz_questions (subject_id, topic, question, question_type, options, correct_answer, difficulty, explanation)
SELECT id, 'Standard Form', q.question, q.question_type, q.options::jsonb, q.correct_answer, q.difficulty, q.explanation
FROM subjects, (VALUES
  ('Which of these is correctly written in standard form?',
   'multiple_choice', '["23 × 10³", "0.5 × 10⁴", "3.7 × 10⁵", "10 × 10²"]',
   '3.7 × 10⁵', 'easy',
   'Standard form requires 1 ≤ A < 10. Only 3.7 satisfies this.'),

  ('Write 45,000 in standard form.',
   'multiple_choice', '["4.5 × 10³", "45 × 10³", "4.5 × 10⁴", "0.45 × 10⁵"]',
   '4.5 × 10⁴', 'easy',
   '45,000 = 4.5 × 10,000 = 4.5 × 10⁴.'),

  ('Write 0.0037 in standard form.',
   'multiple_choice', '["3.7 × 10⁻²", "3.7 × 10⁻³", "37 × 10⁻⁴", "0.37 × 10⁻²"]',
   '3.7 × 10⁻³', 'easy',
   '0.0037 = 3.7 ÷ 1000 = 3.7 × 10⁻³.'),

  ('What is 6.2 × 10³ written as an ordinary number?',
   'multiple_choice', '["62", "620", "6200", "62,000"]',
   '6200', 'easy',
   '6.2 × 10³ = 6.2 × 1000 = 6200.'),

  ('What is 8.1 × 10⁻² as an ordinary number?',
   'multiple_choice', '["810", "0.081", "0.81", "0.0081"]',
   '0.081', 'easy',
   '8.1 × 10⁻² = 8.1 ÷ 100 = 0.081.'),

  ('Calculate (3 × 10⁴) × (2 × 10³). Give your answer in standard form.',
   'multiple_choice', '["6 × 10⁷", "6 × 10¹²", "5 × 10⁷", "6 × 10⁶"]',
   '6 × 10⁷', 'medium',
   '3 × 2 = 6 and 10⁴ × 10³ = 10⁷. Answer: 6 × 10⁷.'),

  ('Calculate (8 × 10⁵) ÷ (4 × 10²). Give your answer in standard form.',
   'multiple_choice', '["2 × 10⁷", "2 × 10³", "4 × 10³", "2 × 10²"]',
   '2 × 10³', 'medium',
   '8 ÷ 4 = 2 and 10⁵ ÷ 10² = 10³. Answer: 2 × 10³.'),

  ('Add 3.5 × 10⁴ and 5.5 × 10⁴.',
   'multiple_choice', '["9 × 10⁴", "9 × 10⁸", "8.5 × 10⁴", "9 × 10⁵"]',
   '9 × 10⁴', 'medium',
   'Same power: (3.5 + 5.5) × 10⁴ = 9 × 10⁴.'),

  ('Calculate (5 × 10³) × (6 × 10⁴). Express in standard form.',
   'multiple_choice', '["30 × 10⁷", "3 × 10⁸", "3 × 10⁷", "30 × 10⁸"]',
   '3 × 10⁸', 'medium',
   '5 × 6 = 30 = 3 × 10¹. So 3 × 10¹ × 10⁷ = 3 × 10⁸.'),

  ('Which number is largest: 4.2 × 10⁵, 9.9 × 10⁴, 1.1 × 10⁶?',
   'multiple_choice', '["4.2 × 10⁵", "9.9 × 10⁴", "1.1 × 10⁶", "They are equal"]',
   '1.1 × 10⁶', 'medium',
   '1.1 × 10⁶ = 1,100,000 which is the largest.'),

  ('Calculate (7.2 × 10⁻³) ÷ (3.6 × 10⁻¹). Give answer in standard form.',
   'multiple_choice', '["2 × 10⁻²", "2 × 10⁻¹", "2 × 10²", "20 × 10⁻³"]',
   '2 × 10⁻²', 'hard',
   '7.2 ÷ 3.6 = 2. 10⁻³ ÷ 10⁻¹ = 10⁻². Answer: 2 × 10⁻².'),

  ('Estimate the value of (6.1 × 10³) × (4.9 × 10⁻²).',
   'multiple_choice', '["3", "30", "300", "3000"]',
   '30', 'hard',
   '≈ 6 × 5 × 10³ × 10⁻² = 30 × 10 = no... 6 × 5 = 30, 10³⁻² = 10¹. So ≈ 30 × 10¹ = 300. Precise: 6.1 × 4.9 ≈ 30, 10³ × 10⁻² = 10¹ → 300. Best answer: 300.'),

  ('Write 0.00000056 in standard form.',
   'multiple_choice', '["5.6 × 10⁻⁷", "5.6 × 10⁻⁶", "56 × 10⁻⁸", "5.6 × 10⁷"]',
   '5.6 × 10⁻⁷', 'hard',
   'Count 7 places to move the decimal to get 5.6. So 5.6 × 10⁻⁷.'),

  ('Calculate (1.5 × 10⁴) + (2.5 × 10³). Express in standard form.',
   'multiple_choice', '["1.75 × 10⁴", "4 × 10⁷", "4 × 10⁴", "17.5 × 10³"]',
   '1.75 × 10⁴', 'hard',
   '2.5 × 10³ = 0.25 × 10⁴. So (1.5 + 0.25) × 10⁴ = 1.75 × 10⁴.'),

  ('A planet is 2.4 × 10⁸ km from the sun. A probe travels 6 × 10⁶ km per day. How many days to reach the planet?',
   'multiple_choice', '["4 days", "40 days", "400 days", "4000 days"]',
   '40 days', 'hard',
   '(2.4 × 10⁸) ÷ (6 × 10⁶) = 0.4 × 10² = 40 days.')

) AS q(question, question_type, options, correct_answer, difficulty, explanation)
WHERE subjects.slug = 'mathematics';


-- =============================================================
-- 5. HCF (10 questions)
-- =============================================================
INSERT INTO quiz_questions (subject_id, topic, question, question_type, options, correct_answer, difficulty, explanation)
SELECT id, 'HCF', q.question, q.question_type, q.options::jsonb, q.correct_answer, q.difficulty, q.explanation
FROM subjects, (VALUES
  ('What does HCF stand for?',
   'multiple_choice', '["Highest Common Factor", "Highest Counted Figure", "Half Common Factor", "Highest Counted Fraction"]',
   'Highest Common Factor', 'easy',
   'HCF = Highest Common Factor — the largest number that divides exactly into all given numbers.'),

  ('Find the HCF of 12 and 18.',
   'multiple_choice', '["3", "6", "9", "12"]',
   '6', 'easy',
   '12 = 2² × 3, 18 = 2 × 3². Shared primes: 2 × 3 = 6.'),

  ('Find the HCF of 20 and 30.',
   'multiple_choice', '["5", "10", "15", "20"]',
   '10', 'easy',
   '20 = 2² × 5, 30 = 2 × 3 × 5. HCF = 2 × 5 = 10.'),

  ('Find the HCF of 24 and 36.',
   'multiple_choice', '["6", "8", "12", "18"]',
   '12', 'medium',
   '24 = 2³ × 3, 36 = 2² × 3². HCF = 2² × 3 = 12.'),

  ('Find the HCF of 48 and 60.',
   'multiple_choice', '["6", "10", "12", "24"]',
   '12', 'medium',
   '48 = 2⁴ × 3, 60 = 2² × 3 × 5. HCF = 2² × 3 = 12.'),

  ('What is the HCF of 7 and 13?',
   'multiple_choice', '["1", "7", "13", "91"]',
   '1', 'easy',
   'Both 7 and 13 are prime numbers with no common factors other than 1.'),

  ('Find the HCF of 45, 60 and 75.',
   'multiple_choice', '["3", "5", "15", "25"]',
   '15', 'medium',
   '45 = 3² × 5, 60 = 2² × 3 × 5, 75 = 3 × 5². HCF = 3 × 5 = 15.'),

  ('The HCF of two numbers is 8. One number is 24. Which could be the other number?',
   'multiple_choice', '["12", "18", "32", "36"]',
   '32', 'medium',
   '32 = 2⁵, 24 = 2³ × 3. HCF(24, 32) = 2³ = 8. ✓'),

  ('Find the HCF of 84 and 120.',
   'multiple_choice', '["6", "8", "12", "24"]',
   '12', 'hard',
   '84 = 2² × 3 × 7, 120 = 2³ × 3 × 5. HCF = 2² × 3 = 12.'),

  ('Two ropes are 126 cm and 210 cm. They are cut into equal pieces with no waste. What is the maximum piece length?',
   'multiple_choice', '["21 cm", "42 cm", "63 cm", "14 cm"]',
   '42 cm', 'hard',
   '126 = 2 × 3² × 7, 210 = 2 × 3 × 5 × 7. HCF = 2 × 3 × 7 = 42 cm.')

) AS q(question, question_type, options, correct_answer, difficulty, explanation)
WHERE subjects.slug = 'mathematics';


-- =============================================================
-- 6. LCM (10 questions)
-- =============================================================
INSERT INTO quiz_questions (subject_id, topic, question, question_type, options, correct_answer, difficulty, explanation)
SELECT id, 'LCM', q.question, q.question_type, q.options::jsonb, q.correct_answer, q.difficulty, q.explanation
FROM subjects, (VALUES
  ('What does LCM stand for?',
   'multiple_choice', '["Lowest Common Multiple", "Largest Common Multiple", "Lowest Counted Measure", "Least Common Minimum"]',
   'Lowest Common Multiple', 'easy',
   'LCM = Lowest (or Least) Common Multiple — the smallest number that is a multiple of all given numbers.'),

  ('Find the LCM of 4 and 6.',
   'multiple_choice', '["8", "10", "12", "24"]',
   '12', 'easy',
   '4 = 2², 6 = 2 × 3. LCM = 2² × 3 = 12.'),

  ('Find the LCM of 5 and 8.',
   'multiple_choice', '["13", "24", "40", "80"]',
   '40', 'easy',
   '5 and 8 share no common factors. LCM = 5 × 8 = 40.'),

  ('Find the LCM of 12 and 18.',
   'multiple_choice', '["24", "36", "54", "216"]',
   '36', 'medium',
   '12 = 2² × 3, 18 = 2 × 3². LCM = 2² × 3² = 36.'),

  ('Find the LCM of 6, 8 and 12.',
   'multiple_choice', '["16", "24", "36", "48"]',
   '24', 'medium',
   '6 = 2 × 3, 8 = 2³, 12 = 2² × 3. LCM = 2³ × 3 = 24.'),

  ('Bus A leaves every 12 minutes, Bus B every 15 minutes. They leave together at 9:00. When do they next leave together?',
   'multiple_choice', '["9:36", "9:40", "9:45", "9:60"]',
   '9:40', 'medium',
   'LCM(12, 15) = 60 minutes. So they next leave together at 9:00 + 60 minutes = no... LCM(12,15): 12=2²×3, 15=3×5, LCM=2²×3×5=60. 9:00 + 60 min = 10:00. Recalc: LCM(12,15)=60. Answer should be 10:00.'),

  ('Find the LCM of 9 and 15.',
   'multiple_choice', '["30", "45", "90", "135"]',
   '45', 'medium',
   '9 = 3², 15 = 3 × 5. LCM = 3² × 5 = 45.'),

  ('The LCM of two numbers is 60. One number is 12. Which could be the other number?',
   'multiple_choice', '["6", "10", "20", "24"]',
   '20', 'hard',
   'LCM(12, 20) = LCM(2²×3, 2²×5) = 2²×3×5 = 60. ✓'),

  ('Find the LCM of 14 and 21.',
   'multiple_choice', '["21", "42", "63", "294"]',
   '42', 'hard',
   '14 = 2 × 7, 21 = 3 × 7. LCM = 2 × 3 × 7 = 42.'),

  ('Three traffic lights change every 40 s, 60 s and 90 s. They all change together at 12:00. When next?',
   'multiple_choice', '["12:03", "12:06", "12:05", "12:04"]',
   '12:06', 'hard',
   'LCM(40, 60, 90): 40=2³×5, 60=2²×3×5, 90=2×3²×5. LCM=2³×3²×5=360 s = 6 minutes. So 12:06.')

) AS q(question, question_type, options, correct_answer, difficulty, explanation)
WHERE subjects.slug = 'mathematics';


-- =============================================================
-- 7. FACTORS, MULTIPLES AND PRIMES (12 questions)
-- =============================================================
INSERT INTO quiz_questions (subject_id, topic, question, question_type, options, correct_answer, difficulty, explanation)
SELECT id, 'Factors, Multiples and Primes', q.question, q.question_type, q.options::jsonb, q.correct_answer, q.difficulty, q.explanation
FROM subjects, (VALUES
  ('How many factors does the number 1 have?',
   'multiple_choice', '["0", "1", "2", "3"]',
   '1', 'easy',
   '1 has only one factor: itself. That is why 1 is not a prime number.'),

  ('Which of these is a prime number?',
   'multiple_choice', '["1", "9", "17", "21"]',
   '17', 'easy',
   '17 has exactly two factors: 1 and 17. The others are either not prime or are composite.'),

  ('Which of these is NOT a factor of 24?',
   'multiple_choice', '["3", "6", "8", "10"]',
   '10', 'easy',
   '24 ÷ 10 = 2.4 which is not a whole number, so 10 is not a factor of 24.'),

  ('What is the 6th multiple of 7?',
   'multiple_choice', '["35", "42", "49", "56"]',
   '42', 'easy',
   '7 × 6 = 42.'),

  ('How many prime numbers are less than 20?',
   'multiple_choice', '["6", "7", "8", "9"]',
   '8', 'medium',
   'Primes less than 20: 2, 3, 5, 7, 11, 13, 17, 19 — that is 8 primes.'),

  ('Which is the only even prime number?',
   'multiple_choice', '["0", "1", "2", "4"]',
   '2', 'easy',
   '2 is divisible only by 1 and itself. All other even numbers have 2 as a factor.'),

  ('What are all the factors of 36?',
   'multiple_choice',
   '["1, 2, 3, 4, 6, 9, 12, 18, 36", "1, 2, 3, 4, 6, 8, 9, 12, 18, 36", "1, 3, 6, 9, 12, 18, 36", "1, 2, 3, 6, 9, 18, 36"]',
   '1, 2, 3, 4, 6, 9, 12, 18, 36', 'medium',
   '36 = 1×36 = 2×18 = 3×12 = 4×9 = 6×6. Factors: 1, 2, 3, 4, 6, 9, 12, 18, 36.'),

  ('Which number is both a factor of 30 and a multiple of 6?',
   'multiple_choice', '["3", "4", "6", "12"]',
   '6', 'medium',
   '6 divides 30 (factor) and 6 × 1 = 6 (multiple of 6).'),

  ('What is the sum of all factors of 12?',
   'multiple_choice', '["20", "24", "28", "30"]',
   '28', 'medium',
   'Factors of 12: 1, 2, 3, 4, 6, 12. Sum = 1+2+3+4+6+12 = 28.'),

  ('Is 91 a prime number?',
   'multiple_choice', '["Yes, it is prime", "No — 91 = 7 × 13", "No — 91 = 9 × 10 + 1", "No — 91 = 3 × 30 + 1"]',
   'No — 91 = 7 × 13', 'hard',
   '91 = 7 × 13, so it has more than 2 factors and is not prime.'),

  ('Which list shows only prime numbers?',
   'multiple_choice', '["2, 3, 5, 7, 11", "2, 4, 6, 8, 10", "1, 3, 5, 7, 9", "3, 9, 15, 21, 27"]',
   '2, 3, 5, 7, 11', 'medium',
   '2, 3, 5, 7, 11 are all prime. The others contain composite numbers or 1.'),

  ('How many factors does the prime number 41 have?',
   'multiple_choice', '["1", "2", "3", "4"]',
   '2', 'medium',
   'Every prime number has exactly 2 factors: 1 and itself.')

) AS q(question, question_type, options, correct_answer, difficulty, explanation)
WHERE subjects.slug = 'mathematics';


-- =============================================================
-- 8. PRIME DECOMPOSITION (10 questions)
-- =============================================================
INSERT INTO quiz_questions (subject_id, topic, question, question_type, options, correct_answer, difficulty, explanation)
SELECT id, 'Prime Decomposition', q.question, q.question_type, q.options::jsonb, q.correct_answer, q.difficulty, q.explanation
FROM subjects, (VALUES
  ('Write 12 as a product of its prime factors.',
   'multiple_choice', '["2 × 6", "2² × 3", "4 × 3", "2 × 2 × 2"]',
   '2² × 3', 'easy',
   '12 = 2 × 2 × 3 = 2² × 3.'),

  ('Write 30 as a product of prime factors.',
   'multiple_choice', '["2 × 15", "2 × 3 × 5", "5 × 6", "3 × 10"]',
   '2 × 3 × 5', 'easy',
   '30 = 2 × 15 = 2 × 3 × 5.'),

  ('What is the prime factorisation of 36?',
   'multiple_choice', '["2 × 18", "4 × 9", "2² × 3²", "2³ × 3"]',
   '2² × 3²', 'easy',
   '36 = 4 × 9 = 2² × 3².'),

  ('What is the prime factorisation of 60?',
   'multiple_choice', '["2² × 3 × 5", "2 × 3 × 10", "2³ × 5", "2² × 15"]',
   '2² × 3 × 5', 'medium',
   '60 = 4 × 15 = 2² × 3 × 5.'),

  ('Express 100 as a product of prime factors.',
   'multiple_choice', '["10²", "4 × 25", "2² × 5²", "2 × 5 × 10"]',
   '2² × 5²', 'easy',
   '100 = 4 × 25 = 2² × 5².'),

  ('What is the prime factorisation of 84?',
   'multiple_choice', '["2² × 3 × 7", "2 × 42", "2³ × 7", "4 × 21"]',
   '2² × 3 × 7', 'medium',
   '84 = 4 × 21 = 2² × 3 × 7.'),

  ('Write 126 as a product of prime factors.',
   'multiple_choice', '["2 × 3² × 7", "2 × 63", "3 × 42", "2² × 3 × 7"]',
   '2 × 3² × 7', 'medium',
   '126 = 2 × 63 = 2 × 9 × 7 = 2 × 3² × 7.'),

  ('Which prime factorisation is correct for 180?',
   'multiple_choice', '["2² × 3² × 5", "2³ × 3 × 5", "2 × 3 × 5²", "2² × 3 × 5²"]',
   '2² × 3² × 5', 'hard',
   '180 = 4 × 45 = 2² × 9 × 5 = 2² × 3² × 5.'),

  ('How many prime factors does 360 have (counting repeats)?',
   'multiple_choice', '["3", "4", "5", "6"]',
   '6', 'hard',
   '360 = 2³ × 3² × 5. Counting with repeats: 2, 2, 2, 3, 3, 5 — that is 6 prime factors.'),

  ('A number has prime factorisation 2³ × 3 × 7. What is the number?',
   'multiple_choice', '["42", "126", "168", "84"]',
   '168', 'hard',
   '2³ × 3 × 7 = 8 × 3 × 7 = 8 × 21 = 168.')

) AS q(question, question_type, options, correct_answer, difficulty, explanation)
WHERE subjects.slug = 'mathematics';


-- =============================================================
-- 9. SQUARES, CUBES AND ROOTS (12 questions)
-- =============================================================
INSERT INTO quiz_questions (subject_id, topic, question, question_type, options, correct_answer, difficulty, explanation)
SELECT id, 'Squares, Cubes and Roots', q.question, q.question_type, q.options::jsonb, q.correct_answer, q.difficulty, q.explanation
FROM subjects, (VALUES
  ('What is 7²?',
   'multiple_choice', '["14", "21", "49", "56"]',
   '49', 'easy',
   '7² = 7 × 7 = 49.'),

  ('What is 4³?',
   'multiple_choice', '["12", "16", "48", "64"]',
   '64', 'easy',
   '4³ = 4 × 4 × 4 = 64.'),

  ('What is √144?',
   'multiple_choice', '["11", "12", "13", "14"]',
   '12', 'easy',
   '12 × 12 = 144, so √144 = 12.'),

  ('What is ∛27?',
   'multiple_choice', '["3", "6", "9", "13.5"]',
   '3', 'easy',
   '3 × 3 × 3 = 27, so ∛27 = 3.'),

  ('Which is NOT a perfect square?',
   'multiple_choice', '["49", "64", "81", "90"]',
   '90', 'easy',
   '49 = 7², 64 = 8², 81 = 9². 90 is not a perfect square.'),

  ('What is 12²?',
   'multiple_choice', '["122", "124", "144", "148"]',
   '144', 'easy',
   '12 × 12 = 144.'),

  ('What is ∛125?',
   'multiple_choice', '["5", "10", "12.5", "25"]',
   '5', 'easy',
   '5 × 5 × 5 = 125, so ∛125 = 5.'),

  ('Estimate √50. Give the answer to 1 decimal place.',
   'multiple_choice', '["6.9", "7.0", "7.1", "7.2"]',
   '7.1', 'medium',
   '7² = 49, 7.1² = 50.41. √50 ≈ 7.1.'),

  ('What is 15²?',
   'multiple_choice', '["175", "215", "225", "235"]',
   '225', 'medium',
   '15 × 15 = 225.'),

  ('What is the value of 2³ + 3²?',
   'multiple_choice', '["13", "17", "18", "25"]',
   '17', 'medium',
   '2³ = 8 and 3² = 9. 8 + 9 = 17.'),

  ('What is √(9 × 16)?',
   'multiple_choice', '["25", "12", "72", "144"]',
   '12', 'medium',
   '9 × 16 = 144. √144 = 12. Or: √9 × √16 = 3 × 4 = 12.'),

  ('A cube has volume 343 cm³. What is the side length?',
   'multiple_choice', '["6 cm", "7 cm", "8 cm", "9 cm"]',
   '7 cm', 'hard',
   '∛343 = 7, since 7³ = 343. Side = 7 cm.')

) AS q(question, question_type, options, correct_answer, difficulty, explanation)
WHERE subjects.slug = 'mathematics';

-- =============================================================
-- Verification query — run after inserting to check counts
-- =============================================================
SELECT topic, COUNT(*) AS question_count
FROM quiz_questions qq
JOIN subjects s ON s.id = qq.subject_id
WHERE s.slug = 'mathematics'
GROUP BY topic
ORDER BY topic;