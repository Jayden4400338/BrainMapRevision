-- Mathematics key-topics quiz seed
-- Adds quiz questions for:
-- Algebra, Geometry, Probability, Pythagoras, Statistics, Trigonometry, Quadratics

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM subjects WHERE slug = 'mathematics') THEN
    RAISE EXCEPTION 'Mathematics subject is missing. Insert it in subjects first.';
  END IF;
END $$;

WITH math_subject AS (
  SELECT id AS subject_id FROM subjects WHERE slug = 'mathematics' LIMIT 1
),
seed(topic, question, options, correct_answer, difficulty, explanation) AS (
  VALUES
    ('Algebra', 'Simplify 5x + 3x - 2.', '["8x - 2","8x + 2","10x - 2","2x + 8"]', '8x - 2', 'easy', 'Combine like terms: 5x + 3x = 8x.'),
    ('Algebra', 'Solve 2x + 7 = 19.', '["x = 4","x = 5","x = 6","x = 7"]', 'x = 6', 'easy', '2x = 12 so x = 6.'),
    ('Algebra', 'Expand 3(x - 4).', '["3x - 4","3x - 12","x - 12","3x + 12"]', '3x - 12', 'easy', 'Distribute 3 across each term.'),

    ('Geometry', 'Angles on a straight line add to:', '["90","180","270","360"]', '180', 'easy', 'A straight line is half a full turn.'),
    ('Geometry', 'Interior angle sum of a pentagon is:', '["360","540","720","900"]', '540', 'medium', '(n - 2) x 180 with n=5.'),
    ('Geometry', 'Exterior angles of any polygon add to:', '["180","270","360","540"]', '360', 'easy', 'Always 360 degrees in total.'),

    ('Probability', 'A fair coin is flipped once. P(heads)=', '["1/4","1/3","1/2","1"]', '1/2', 'easy', 'Two equally likely outcomes.'),
    ('Probability', 'If P(A)=0.35, then P(not A)=', '["0.35","0.50","0.65","0.75"]', '0.65', 'easy', 'Use 1 - P(A).'),
    ('Probability', 'Independent events with P(A)=0.4 and P(B)=0.5. P(A and B)=', '["0.1","0.2","0.4","0.9"]', '0.2', 'medium', 'Multiply independent probabilities.'),

    ('Pythagoras', 'In a right triangle with legs 3 and 4, hypotenuse is:', '["5","6","7","8"]', '5', 'easy', '3^2 + 4^2 = 5^2.'),
    ('Pythagoras', 'If c=13 and one leg is 5, other leg is:', '["8","10","12","15"]', '12', 'medium', 'a = sqrt(13^2 - 5^2) = 12.'),
    ('Pythagoras', 'Which triangle is right-angled?', '["5,6,7","7,24,25","8,9,10","10,11,12"]', '7,24,25', 'medium', '7^2 + 24^2 = 25^2.'),

    ('Statistics', 'Mean of 2, 5, 8 is:', '["4","5","6","7"]', '5', 'easy', '(2+5+8)/3 = 5.'),
    ('Statistics', 'Range of 4, 11, 7, 10 is:', '["4","6","7","11"]', '7', 'easy', '11 - 4 = 7.'),
    ('Statistics', 'Frequency density equals:', '["class width / frequency","frequency / class width","frequency x class width","frequency + class width"]', 'frequency / class width', 'medium', 'Used for histograms.'),

    ('Trigonometry', 'SOH means:', '["sin = opp/hyp","sin = adj/hyp","sin = opp/adj","sin = hyp/opp"]', 'sin = opp/hyp', 'easy', 'SOHCAHTOA mnemonic.'),
    ('Trigonometry', 'If opposite=6 and hypotenuse=10, sin(theta)=', '["0.4","0.5","0.6","0.8"]', '0.6', 'easy', '6/10 = 0.6.'),
    ('Trigonometry', 'If tan(theta)=1, theta is:', '["30","45","60","90"]', '45', 'medium', 'tan 45 = 1 in degrees.'),

    ('Quadratics', 'Factorise x^2 + 5x + 6.', '["(x+1)(x+6)","(x+2)(x+3)","(x-2)(x-3)","(x+5)(x+1)"]', '(x+2)(x+3)', 'medium', 'Need two numbers that add to 5 and multiply to 6.'),
    ('Quadratics', 'Solve x^2 - 16 = 0.', '["x=4 only","x=-4 only","x=4 or -4","x=16"]', 'x=4 or -4', 'easy', 'Difference of squares gives two roots.'),
    ('Quadratics', 'In x = [-b +/- sqrt(b^2 - 4ac)]/(2a), b^2 - 4ac is called:', '["gradient","discriminant","coefficient","intercept"]', 'discriminant', 'hard', 'It determines the number of real roots.')
)
INSERT INTO quiz_questions (
  subject_id,
  topic,
  question,
  question_type,
  options,
  correct_answer,
  difficulty,
  explanation
)
SELECT
  m.subject_id,
  s.topic,
  s.question,
  'multiple_choice',
  s.options::jsonb,
  s.correct_answer,
  s.difficulty,
  s.explanation
FROM seed s
CROSS JOIN math_subject m
WHERE NOT EXISTS (
  SELECT 1
  FROM quiz_questions q
  WHERE q.subject_id = m.subject_id
    AND q.topic = s.topic
    AND q.question = s.question
);
-- Mathematics key-topics quiz seed (requested topics)
-- Topics included:
-- 1. Angles Around a Point
-- 2. Reflections
-- 3. Transformations
-- 4. Standard Form
-- 5. HCF
-- 6. LCM
-- 7. Factors, Multiples & Primes
-- 8. Prime Decomposition
-- 9. Squares & Roots

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM subjects WHERE slug = 'mathematics') THEN
    RAISE EXCEPTION 'Mathematics subject is missing. Insert it in subjects first.';
  END IF;
END $$;

WITH math_subject AS (
  SELECT id AS subject_id FROM subjects WHERE slug = 'mathematics' LIMIT 1
),
seed(topic, question, options, correct_answer, difficulty, explanation) AS (
  VALUES
    -- 1) Angles Around a Point
    ('Angles Around a Point', 'Angles around a point sum to:', '["90","180","270","360"]', '360', 'easy', 'A full turn is 360 degrees.'),
    ('Angles Around a Point', 'Angles on a straight line sum to:', '["90","120","180","360"]', '180', 'easy', 'A straight line is half a turn.'),
    ('Angles Around a Point', 'If three angles around a point are 120, 95 and x, find x.', '["125","135","145","155"]', '145', 'medium', 'x = 360 - (120 + 95).'),

    -- 2) Reflections
    ('Reflections', 'Reflecting (4, -2) in the y-axis gives:', '["(-4,-2)","(4,2)","(-4,2)","(2,4)"]', '(-4,-2)', 'easy', 'In y-axis reflection, x changes sign.'),
    ('Reflections', 'Reflecting (3, 5) in the x-axis gives:', '["(-3,5)","(3,-5)","(-3,-5)","(5,3)"]', '(3,-5)', 'easy', 'In x-axis reflection, y changes sign.'),
    ('Reflections', 'Reflecting (2, 7) in y = x gives:', '["(7,2)","(-2,-7)","(2,-7)","(-7,2)"]', '(7,2)', 'medium', 'Coordinates swap in y = x.'),

    -- 3) Transformations
    ('Transformations', 'Which transformation is described by a vector?', '["Rotation","Reflection","Translation","Enlargement"]', 'Translation', 'easy', 'Translations are described by vectors.'),
    ('Transformations', 'A shape enlarged by scale factor 3 has side lengths:', '["Tripled","Doubled","Halved","Unchanged"]', 'Tripled', 'easy', 'Lengths are multiplied by scale factor.'),
    ('Transformations', 'A 90 degree clockwise rotation about origin maps (x, y) to:', '["(-y,x)","(y,-x)","(-x,-y)","(x,-y)"]', '(y,-x)', 'hard', 'Standard 90 clockwise mapping.'),

    -- 4) Standard Form
    ('Standard Form', 'Which is valid standard form?', '["25 x 10^3","0.7 x 10^5","3.2 x 10^4","10 x 10^2"]', '3.2 x 10^4', 'easy', 'Coefficient must be 1 <= A < 10.'),
    ('Standard Form', 'Write 56,000 in standard form.', '["5.6 x 10^4","56 x 10^3","0.56 x 10^5","5.6 x 10^3"]', '5.6 x 10^4', 'easy', 'Move decimal 4 places left.'),
    ('Standard Form', '(2 x 10^3) x (3 x 10^4) =', '["6 x 10^7","6 x 10^6","5 x 10^7","6 x 10^8"]', '6 x 10^7', 'medium', 'Multiply coefficients and add powers.'),

    -- 5) HCF
    ('HCF', 'What does HCF stand for?', '["Highest Common Factor","Higher Common Fraction","Highest Common Fraction","Higher Count Factor"]', 'Highest Common Factor', 'easy', 'Definition recall.'),
    ('HCF', 'Find the HCF of 12 and 18.', '["3","6","9","12"]', '6', 'easy', 'Common factors are 1,2,3,6.'),
    ('HCF', 'Find the HCF of 24 and 36.', '["6","8","10","12"]', '12', 'medium', 'Prime factors give shared product 12.'),

    -- 6) LCM
    ('LCM', 'What does LCM stand for?', '["Lowest Common Multiple","Largest Common Multiple","Lowest Common Measure","Largest Common Measure"]', 'Lowest Common Multiple', 'easy', 'Definition recall.'),
    ('LCM', 'Find the LCM of 4 and 6.', '["10","12","14","24"]', '12', 'easy', '12 is first shared multiple.'),
    ('LCM', 'Find the LCM of 12 and 18.', '["24","30","36","42"]', '36', 'medium', 'Use highest powers of prime factors.'),

    -- 7) Factors, Multiples & Primes
    ('Factors, Multiples & Primes', 'Which number is prime?', '["21","29","33","39"]', '29', 'easy', '29 has exactly two factors.'),
    ('Factors, Multiples & Primes', 'A factor of 36 is:', '["7","9","11","13"]', '9', 'easy', '36 divided by 9 is exact.'),
    ('Factors, Multiples & Primes', 'Which is a multiple of both 3 and 4?', '["10","12","15","18"]', '12', 'medium', '12 is in both times tables.'),

    -- 8) Prime Decomposition
    ('Prime Decomposition', 'Prime factor decomposition of 20 is:', '["2 x 10","2^2 x 5","4 x 5","2 x 2 x 2 x 5"]', '2^2 x 5', 'easy', 'Fully prime with index notation.'),
    ('Prime Decomposition', 'Prime factors of 60 are:', '["2^2 x 3 x 5","2 x 30","6 x 10","3 x 20"]', '2^2 x 3 x 5', 'medium', 'Complete prime factorization of 60.'),
    ('Prime Decomposition', 'Using prime factors, HCF of 18 and 24 is:', '["3","6","9","12"]', '6', 'medium', '18=2 x 3^2 and 24=2^3 x 3, so HCF=2 x 3.'),

    -- 9) Squares & Roots
    ('Squares & Roots', 'What is 13 squared?', '["156","159","169","196"]', '169', 'easy', '13 x 13 = 169.'),
    ('Squares & Roots', 'What is the square root of 225?', '["12","13","14","15"]', '15', 'easy', '15 x 15 = 225.'),
    ('Squares & Roots', 'Simplify sqrt(144) + sqrt(49).', '["17","18","19","21"]', '19', 'medium', '12 + 7 = 19.')
)
INSERT INTO quiz_questions (
  subject_id,
  topic,
  question,
  question_type,
  options,
  correct_answer,
  difficulty,
  explanation
)
SELECT
  m.subject_id,
  s.topic,
  s.question,
  'multiple_choice',
  s.options::jsonb,
  s.correct_answer,
  s.difficulty,
  s.explanation
FROM seed s
CROSS JOIN math_subject m
WHERE NOT EXISTS (
  SELECT 1
  FROM quiz_questions q
  WHERE q.subject_id = m.subject_id
    AND q.topic = s.topic
    AND q.question = s.question
);
