CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  city TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  availability JSONB NOT NULL DEFAULT '{}'::jsonb,
  interests TEXT[] NOT NULL DEFAULT '{}',
  experience_level INT NOT NULL DEFAULT 1,
  motivation TEXT,
  rodo_consent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seniors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  age_range TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  interests TEXT[] NOT NULL DEFAULT '{}',
  short_description TEXT NOT NULL,
  full_description TEXT,
  mobility TEXT,
  likes TEXT[] NOT NULL DEFAULT '{}',
  avoid_topics TEXT[] NOT NULL DEFAULT '{}',
  waiting_since DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  senior_id UUID NOT NULL REFERENCES seniors(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'proposed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL UNIQUE REFERENCES volunteers(id) ON DELETE CASCADE,
  senior_id UUID NOT NULL REFERENCES seniors(id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS planned_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reasoning TEXT,
  duration TEXT,
  prep TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  duration_minutes INT,
  what_we_did TEXT,
  mood TEXT,
  anecdote TEXT,
  next_time_plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
