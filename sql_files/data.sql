-- =============================================================
-- SEED DATA SCRIPT
-- Populates: users, registration, groupset, groupset_members,
--            blog, settings
-- Skips:     colleges, events (use provided SQL file first)
-- =============================================================

-- NOTE: Run the provided colleges/events INSERT script first,
--       then run this file.

-- ---------------------------------------------------------------
-- HELPERS
-- ---------------------------------------------------------------
-- Django's unusable password hash (for organizers / demo accounts
-- that won't log in via password in tests).  Real accounts use
-- pbkdf2_sha256 hashes; the value below is Django's
-- make_unusable_password() sentinel so the ORM won't accept it.
-- For a real dev environment replace with a proper hash from:
--   python manage.py shell -c "from django.contrib.auth.hashers import make_password; print(make_password('Password123'))"

-- ---------------------------------------------------------------
-- SETTINGS  (1 active competition year)
-- ---------------------------------------------------------------
INSERT INTO settings (
    reg_year, early_reg_start, early_reg_end,
    reg_start, reg_end, comp_date,
    contact_email, school_id, created_at
)
SELECT
    2025,
    '2025-01-15',
    '2025-02-01',
    '2025-02-01',
    '2025-03-15',
    '2025-04-12',
    'wushucomp@example.org',
    college_id,
    NOW()
FROM colleges
WHERE college_name = 'UC Berkeley'
LIMIT 1;

-- ---------------------------------------------------------------
-- USERS — organizers (user_type = 'O')
-- ---------------------------------------------------------------
INSERT INTO users (
    user_id, password, last_login, is_superuser,
    first_name, last_name, email,
    is_staff, is_active, date_joined,
    user_type, gender, school_id,
    student_type, first_comp, skill_level,
    grad_date, is_competing, has_paid, proof_of_reg
) VALUES
(
    gen_random_uuid(),
    '!unusable',                        -- unusable password sentinel
    NULL, FALSE,
    'Alex', 'Chen',
    'alex.chen@example.org',
    FALSE, TRUE, NOW(),
    'O', 'M', NULL,
    NULL, NULL, NULL,
    NULL, FALSE, FALSE, FALSE
),
(
    gen_random_uuid(),
    '!unusable',
    NULL, FALSE,
    'Sarah', 'Liu',
    'sarah.liu@example.org',
    FALSE, TRUE, NOW(),
    'O', 'F', NULL,
    NULL, NULL, NULL,
    NULL, FALSE, FALSE, FALSE
),
(
    gen_random_uuid(),
    '!unusable',
    NULL, TRUE,                         -- superuser organizer
    'Admin', 'Wushu',
    'admin@wushucomp.org',
    TRUE, TRUE, NOW(),
    'O', 'M', NULL,
    NULL, NULL, NULL,
    NULL, FALSE, FALSE, FALSE
);

-- ---------------------------------------------------------------
-- USERS — competitors (user_type = 'C')
-- Each references a real college from the colleges table.
-- ---------------------------------------------------------------
INSERT INTO users (
    user_id, password, last_login, is_superuser,
    first_name, last_name, email,
    is_staff, is_active, date_joined,
    user_type, gender, school_id,
    student_type, first_comp, skill_level,
    grad_date, is_competing, has_paid, proof_of_reg
)
SELECT
    gen_random_uuid(),
    '!unusable',
    NULL, FALSE,
    first_name, last_name, email,
    FALSE, TRUE, NOW(),
    'C', gender, c.college_id,
    student_type, first_comp, skill_level,
    grad_date, is_competing, has_paid, proof_of_reg
FROM (VALUES
    ('Jordan',  'Park',    'jordan.park@student.example.com',    'M', 'UC Berkeley',               '1', 2022, 'A', '2025-05-15'::DATE, TRUE,  TRUE,  TRUE),
    ('Mia',     'Nguyen',  'mia.nguyen@student.example.com',     'F', 'UC Berkeley',               '1', 2023, 'I', '2026-05-15'::DATE, TRUE,  TRUE,  TRUE),
    ('Kevin',   'Zhang',   'kevin.zhang@student.example.com',    'M', 'Stanford U',                '2', 2020, 'A', '2025-06-01'::DATE, TRUE,  TRUE,  TRUE),
    ('Linda',   'Wu',      'linda.wu@student.example.com',       'F', 'Stanford U',                '1', 2021, 'A', '2025-12-15'::DATE, TRUE,  TRUE,  TRUE),
    ('Marcus',  'Johnson', 'marcus.j@student.example.com',       'M', 'UC Los Angeles',            '1', 2023, 'I', '2026-05-20'::DATE, TRUE,  TRUE,  FALSE),
    ('Priya',   'Sharma',  'priya.s@student.example.com',        'F', 'UC Los Angeles',            '1', 2024, 'B', '2027-05-15'::DATE, TRUE,  FALSE, FALSE),
    ('Tyler',   'Brown',   'tyler.b@student.example.com',        'M', 'UC San Diego',              '2', 2019, 'A', '2025-06-15'::DATE, TRUE,  TRUE,  TRUE),
    ('Emily',   'Wang',    'emily.w@student.example.com',        'F', 'UC San Diego',              '1', 2022, 'I', '2026-05-10'::DATE, TRUE,  TRUE,  TRUE),
    ('Chris',   'Lee',     'chris.lee@student.example.com',      'M', 'Cornell U',                 '2', 2021, 'A', '2025-05-28'::DATE, TRUE,  TRUE,  TRUE),
    ('Anika',   'Patel',   'anika.p@student.example.com',        'F', 'Cornell U',                 '1', 2023, 'I', '2026-05-28'::DATE, TRUE,  TRUE,  FALSE),
    ('Derek',   'Tan',     'derek.tan@student.example.com',      'M', 'Columbia U',                '2', 2020, 'A', '2025-05-15'::DATE, TRUE,  TRUE,  TRUE),
    ('Yuki',    'Ito',     'yuki.ito@student.example.com',       'F', 'Columbia U',                '1', 2022, 'I', '2026-05-15'::DATE, TRUE,  TRUE,  TRUE),
    ('Nathan',  'Kim',     'nathan.k@student.example.com',       'M', 'UC Irvine',                 '1', 2023, 'B', '2027-06-01'::DATE, TRUE,  FALSE, FALSE),
    ('Sophie',  'Lam',     'sophie.l@student.example.com',       'F', 'UC Irvine',                 '1', 2024, 'B', '2028-05-15'::DATE, FALSE, FALSE, FALSE),
    ('Daniel',  'Hsu',     'daniel.hsu@student.example.com',     'M', 'Georgia Tech',              '2', 2021, 'A', '2025-12-15'::DATE, TRUE,  TRUE,  TRUE),
    ('Rachel',  'Choi',    'rachel.c@student.example.com',       'F', 'Georgia Tech',              '1', 2022, 'I', '2026-05-01'::DATE, TRUE,  TRUE,  TRUE),
    ('Ryan',    'Flores',  'ryan.f@student.example.com',         'M', 'U Southern California',     '1', 2023, 'I', '2026-05-15'::DATE, TRUE,  TRUE,  FALSE),
    ('Jessica', 'Moon',    'jessica.m@student.example.com',      'F', 'U Southern California',     '1', 2022, 'A', '2025-05-15'::DATE, TRUE,  TRUE,  TRUE),
    ('Brian',   'Yao',     'brian.y@student.example.com',        'M', 'U Washington',              '1', 2021, 'A', '2025-06-15'::DATE, TRUE,  TRUE,  TRUE),
    ('Chloe',   'Sun',     'chloe.s@student.example.com',        'F', 'U Washington',              '1', 2022, 'I', '2026-06-01'::DATE, TRUE,  TRUE,  TRUE),
    ('Eric',    'Ma',      'eric.ma@student.example.com',        'M', 'Carnegie Mellon U',         '2', 2020, 'A', '2025-05-20'::DATE, TRUE,  TRUE,  TRUE),
    ('Lily',    'Zhou',    'lily.z@student.example.com',         'F', 'Carnegie Mellon U',         '2', 2022, 'I', '2025-12-15'::DATE, TRUE,  TRUE,  TRUE),
    ('Jason',   'Ho',      'jason.ho@student.example.com',       'M', 'New York U',                '1', 2023, 'B', '2027-05-15'::DATE, TRUE,  FALSE, FALSE),
    ('Amy',     'Lin',     'amy.lin@student.example.com',        'F', 'New York U',                '1', 2024, 'B', '2028-05-15'::DATE, FALSE, FALSE, FALSE),
    ('Patrick', 'Gao',     'patrick.g@student.example.com',      'M', 'San Jose State U',          '1', 2021, 'I', '2025-05-28'::DATE, TRUE,  TRUE,  TRUE),
    ('Diana',   'Tran',    'diana.t@student.example.com',        'F', 'San Jose State U',          '1', 2022, 'A', '2025-12-20'::DATE, TRUE,  TRUE,  TRUE),
    ('Michael', 'Xu',      'michael.x@student.example.com',      'M', 'U Texas',                   '1', 2020, 'A', '2025-05-10'::DATE, TRUE,  TRUE,  TRUE),
    ('Grace',   'Fang',    'grace.f@student.example.com',        'F', 'U Texas',                   '1', 2021, 'A', '2025-05-10'::DATE, TRUE,  TRUE,  TRUE),
    ('Steven',  'Bao',     'steven.b@student.example.com',       'M', 'Ohio State U',              '1', 2022, 'I', '2026-05-01'::DATE, TRUE,  TRUE,  FALSE),
    ('Katie',   'Song',    'katie.s@student.example.com',        'F', 'Ohio State U',              '1', 2023, 'I', '2026-05-01'::DATE, TRUE,  TRUE,  TRUE)
) AS t(first_name, last_name, email, gender, college_name, student_type, first_comp, skill_level, grad_date, is_competing, has_paid, proof_of_reg)
JOIN colleges c ON c.college_name = t.college_name;

-- ---------------------------------------------------------------
-- REGISTRATIONS  (comp_year = 2025)
-- Maps competitor emails → event codes they are registered for.
-- ---------------------------------------------------------------
INSERT INTO registration (competitor_id, event_code, comp_year, date_created, nandu_str)
SELECT u.user_id, e.event_code, 2025, NOW(), NULL
FROM (VALUES
    -- Advanced Male competitors
    ('jordan.park@student.example.com',   'AMA101'),   -- Adv Male Longfist
    ('jordan.park@student.example.com',   'AMA121'),   -- Adv Male Straightsword
    ('kevin.zhang@student.example.com',   'AMA102'),   -- Adv Male Southern Fist
    ('kevin.zhang@student.example.com',   'AMA122'),   -- Adv Male Broadsword
    ('tyler.b@student.example.com',       'AMA141'),   -- Adv Male Spear
    ('tyler.b@student.example.com',       'AMA142'),   -- Adv Male Staff
    ('chris.lee@student.example.com',     'AMA201'),   -- Adv Male Trad Open Barehand
    ('derek.tan@student.example.com',     'AMA301'),   -- Adv Male 42 Fist
    ('derek.tan@student.example.com',     'AMA302'),   -- Adv Male 42 Sword
    ('daniel.hsu@student.example.com',    'NMN111'),   -- Adv Male Nandu Longfist (nandu)
    ('daniel.hsu@student.example.com',    'NMN112'),   -- Adv Male Nandu Southern Fist (nandu)
    ('brian.y@student.example.com',       'AMA321'),   -- Adv Male Taiji 24
    ('eric.ma@student.example.com',       'AMA322'),   -- Adv Male Yang
    ('michael.x@student.example.com',     'AMA323'),   -- Adv Male Chen
    ('ryan.f@student.example.com',        'AMA361'),   -- Adv Male Internal Open Barehand
    ('steven.b@student.example.com',      'AMA341'),   -- Adv Male Taiji Weapon
    -- Advanced Female competitors
    ('linda.wu@student.example.com',      'AFA101'),   -- Adv Female Longfist
    ('linda.wu@student.example.com',      'AFA121'),   -- Adv Female Straightsword
    ('jessica.m@student.example.com',     'AFA102'),   -- Adv Female Southern Fist
    ('emily.w@student.example.com',       'AFA141'),   -- Adv Female Spear
    ('emily.w@student.example.com',       'AFA142'),   -- Adv Female Staff
    ('yuki.ito@student.example.com',      'AFA301'),   -- Adv Female 42 Fist
    ('yuki.ito@student.example.com',      'AFA302'),   -- Adv Female 42 Sword
    ('rachel.c@student.example.com',      'NFN111'),   -- Adv Female Nandu Longfist (nandu)
    ('rachel.c@student.example.com',      'NFN112'),   -- Adv Female Nandu Southern Fist (nandu)
    ('grace.f@student.example.com',       'AFA322'),   -- Adv Female Yang
    ('grace.f@student.example.com',       'AFA323'),   -- Adv Female Chen
    ('chloe.s@student.example.com',       'AFA321'),   -- Adv Female Taiji 24
    ('lily.z@student.example.com',        'AFA341'),   -- Adv Female Taiji Weapon
    ('diana.t@student.example.com',       'AFA361'),   -- Adv Female Internal Open Barehand
    ('katie.s@student.example.com',       'AFA281'),   -- Adv Female Trad Soft Weapon
    -- Intermediate Male competitors
    ('marcus.j@student.example.com',      'IMA101'),   -- Int Male Longfist
    ('marcus.j@student.example.com',      'IMA122'),   -- Int Male Broadsword
    ('nathan.k@student.example.com',      'IMA102'),   -- Int Male Southern Fist
    ('jason.ho@student.example.com',      'IMA321'),   -- Int Male Taiji 24
    ('patrick.g@student.example.com',     'IMA201'),   -- Int Male Trad Open Barehand
    ('steven.b@student.example.com',      'IMA341'),   -- Int Male Taiji Weapon
    -- Intermediate Female competitors
    ('mia.nguyen@student.example.com',    'IFA101'),   -- Int Female Longfist
    ('mia.nguyen@student.example.com',    'IFA122'),   -- Int Female Broadsword
    ('anika.p@student.example.com',       'IFA102'),   -- Int Female Southern Fist
    ('sophie.l@student.example.com',      'IFA321'),   -- Int Female Taiji 24
    -- Beginner Male competitors
    ('nathan.k@student.example.com',      'BMA101'),   -- Beg Male Longfist (also doing intermediate)
    -- Beginner Female competitors
    ('priya.s@student.example.com',       'BFA101'),   -- Beg Female Longfist
    ('priya.s@student.example.com',       'BFA321')    -- Beg Female Taiji 24
) AS reg(email, event_code)
JOIN users u ON u.email = reg.email
JOIN events e ON e.event_code = reg.event_code;

-- Nandu registrations need a nandu_str value
UPDATE registration r
SET nandu_str = 'C,B,C,A,D'
FROM users u, events e
WHERE r.competitor_id = u.user_id
  AND r.event_code = e.event_code
  AND e.is_nandu = TRUE
  AND r.nandu_str IS NULL;

-- ---------------------------------------------------------------
-- GROUPSETS  (team events, 2025)
-- ---------------------------------------------------------------
INSERT INTO groupset (groupset_id, comp_year, school_id, team_name, date_created)
SELECT
    gen_random_uuid(), 2025, c.college_id, t.team_name, NOW()
FROM (VALUES
    ('UC Berkeley',           'Berkeley Wushu A'),
    ('UC Berkeley',           'Berkeley Wushu B'),
    ('Stanford U',            'Stanford Dragon'),
    ('UC Los Angeles',        'UCLA Tiger'),
    ('UC San Diego',          'UCSD Phoenix'),
    ('U Southern California', 'USC Iron Fist'),
    ('U Washington',          'UW Crane'),
    ('Carnegie Mellon U',     'CMU Lotus')
) AS t(college_name, team_name)
JOIN colleges c ON c.college_name = t.college_name;

-- ---------------------------------------------------------------
-- GROUPSET MEMBERS
-- ---------------------------------------------------------------
INSERT INTO groupset_members (groupset_id, member, date_joined, leader)
SELECT gs.groupset_id, u.user_id, NOW(), is_leader
FROM (VALUES
    ('Berkeley Wushu A', 'jordan.park@student.example.com',  TRUE),
    ('Berkeley Wushu A', 'mia.nguyen@student.example.com',   FALSE),
    ('Berkeley Wushu B', 'priya.s@student.example.com',      TRUE),
    ('Berkeley Wushu B', 'nathan.k@student.example.com',     FALSE),
    ('Stanford Dragon',  'kevin.zhang@student.example.com',  TRUE),
    ('Stanford Dragon',  'linda.wu@student.example.com',     FALSE),
    ('UCLA Tiger',       'marcus.j@student.example.com',     TRUE),
    ('UCLA Tiger',       'anika.p@student.example.com',      FALSE),
    ('UCSD Phoenix',     'tyler.b@student.example.com',      TRUE),
    ('UCSD Phoenix',     'emily.w@student.example.com',      FALSE),
    ('USC Iron Fist',    'ryan.f@student.example.com',       TRUE),
    ('USC Iron Fist',    'jessica.m@student.example.com',    FALSE),
    ('UW Crane',         'brian.y@student.example.com',      TRUE),
    ('UW Crane',         'chloe.s@student.example.com',      FALSE),
    ('CMU Lotus',        'eric.ma@student.example.com',      TRUE),
    ('CMU Lotus',        'lily.z@student.example.com',       FALSE)
) AS t(team_name, email, is_leader)
JOIN groupset gs ON gs.team_name = t.team_name
JOIN users    u  ON u.email      = t.email;

-- ---------------------------------------------------------------
-- BLOG POSTS
-- ---------------------------------------------------------------
INSERT INTO blog (blog_id, date_created, author, category, title, blog_content)
VALUES
(
    gen_random_uuid(),
    NOW() - INTERVAL '90 days',
    'Sarah Liu',
    'Announcements',
    '2025 Intercollegiate Wushu Tournament Registration Now Open',
    'We are thrilled to announce that registration for the 2025 Intercollegiate Wushu Tournament is officially open! '
    'This year''s competition will be hosted at UC Berkeley on April 12, 2025. '
    'Early registration runs through February 1st — don''t miss the discounted entry fee. '
    'All currently enrolled students at participating institutions are eligible to compete. '
    'Please log in to your account to complete your registration and upload proof of enrollment.'
),
(
    gen_random_uuid(),
    NOW() - INTERVAL '60 days',
    'Alex Chen',
    'Rules & Guidelines',
    'Nandu Event Guidelines for 2025',
    'Competitors registered in Nandu events are required to submit their nandu string at least two weeks before the competition date. '
    'Each nandu string must contain exactly five elements separated by commas (e.g., C,B,C,A,D). '
    'Judges will evaluate difficulty, execution, and overall performance. '
    'Please review the full rulebook available in the Resources section for a complete list of approved elements and scoring criteria.'
),
(
    gen_random_uuid(),
    NOW() - INTERVAL '45 days',
    'Alex Chen',
    'Training Tips',
    'Preparing for Your First Wushu Competition',
    'If this is your first intercollegiate competition, congratulations on taking this exciting step! '
    'Here are a few tips to help you feel ready on competition day. '
    'First, practice in your competition uniform at least a week in advance so you are comfortable with the fit. '
    'Second, film yourself performing your routine and review the footage critically. '
    'Third, arrive early on competition day to warm up and familiarize yourself with the performance area. '
    'Most importantly, trust your training and enjoy the experience!'
),
(
    gen_random_uuid(),
    NOW() - INTERVAL '20 days',
    'Sarah Liu',
    'Announcements',
    'Hotel & Travel Information for April 12th',
    'For competitors and spectators traveling to the UC Berkeley campus for the 2025 tournament, '
    'we have arranged a discounted room block at a nearby hotel. '
    'Details and the booking link have been emailed to all registered competitors. '
    'Parking will be available in the Underhill Parking Structure — please see the venue map on the event page. '
    'Doors open at 7:30 AM and the first event begins promptly at 9:00 AM.'
),
(
    gen_random_uuid(),
    NOW() - INTERVAL '5 days',
    'Alex Chen',
    'Announcements',
    'Registration Closing Soon — March 15th Deadline',
    'A reminder that competitor registration closes on March 15, 2025. '
    'If you have not yet submitted proof of enrollment or completed payment, please do so immediately to secure your spot. '
    'Registrations without completed payment and verified enrollment will be removed after the deadline. '
    'Contact us at wushucomp@example.org with any questions.'
);

-- ---------------------------------------------------------------
-- VERIFICATION QUERIES (optional — comment out for production)
-- ---------------------------------------------------------------
-- SELECT user_type, COUNT(*) FROM users GROUP BY user_type;
-- SELECT COUNT(*) FROM registration;
-- SELECT COUNT(*) FROM groupset_members;
-- SELECT COUNT(*) FROM blog;