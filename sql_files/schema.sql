CREATE TYPE GENDER AS ENUM('M', 'F');
CREATE TYPE STUDENT_TYPE AS ENUM ('U', 'G');
CREATE TYPE SKILL_LEVEL AS ENUM('B', 'I', 'A');

CREATE TABLE Users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash BYTEA UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender GENDER NOT NULL,
    school_id UUID REFERENCES Colleges(college_id),
    student_type STUDENT_TYPE NOT NULL,
    first_comp DATE NOT NULL,
    undergrad_year INT,
    skill_level SKILL_LEVEL NOT NULL,
    grad_date DATE NOT NULL,
    is_competing BOOLEAN DEFAULT FALSE,
    has_paid BOOLEAN DEFAULT FALSE,
    proof_of_reg BOOLEAN DEFAULT FALSE
);

CREATE TABLE Registration (
    competitor_id UUID REFERENCES Users(user_id),
    comp_year DATE NOT NULL,
    event_code TEXT NOT NULL REFERENCES Events(event_code),
    date_created TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (competitor_id, comp_year, event_code)
);

CREATE TABLE Events (
    event_code TEXT PRIMARY KEY,
    event_name TEXT UNIQUE NOT NULL,
    event_level SKILL_LEVEL NOT NULL,
    gender_category GENDER NOT NULL,
    is_nandu BOOLEAN NOT NULL
);

CREATE TABLE Groupset (
    groupset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comp_year DATE NOT NULL,
    school_id UUID REFERENCES Colleges(college_id) NOT NULL,
    team_leader UUID REFERENCES Users(user_id),
    member_2 UUID REFERENCES Users(user_id),
    member_3 UUID REFERENCES Users(user_id),
    member_4 UUID REFERENCES Users(user_id),
    member_5 UUID REFERENCES Users(user_id),
    member_6 UUID REFERENCES Users(user_id),
    date_created TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE Colleges (
    college_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_name TEXT NOT NULL
);

CREATE TABLE Blog (
    blog_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_created TIMESTAMP WITH TIME ZONE DEFAULT now(),
    author TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    blog_content TEXT NOT NULL
);

CREATE TABLE Admin (
    admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user TEXT UNIQUE NOT NULL,
    admin_password BYTEA UNIQUE NOT NULL
);

CREATE TABLE Nandu (
    competitor_id UUID REFERENCES Users(user_id),
    comp_year DATE NOT NULL,
    event_code TEXT NOT NULL REFERENCES Events(event_code),
    nandu_str TEXT NOT NULL,
    date_created TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (competitor_id, comp_year, event_code)
);

