-- Migimo Identity V1. Apply only to a new development database after review.
-- Google subject (sub) is the stable external identifier; email can change.
CREATE TABLE migimo_members (
  id uuid PRIMARY KEY,
  full_name_ktp text NOT NULL CHECK (length(trim(full_name_ktp)) BETWEEN 2 AND 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE migimo_google_identities (
  google_sub text PRIMARY KEY,
  member_id uuid NOT NULL UNIQUE REFERENCES migimo_members(id) ON DELETE RESTRICT,
  email text NOT NULL,
  email_verified boolean NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX migimo_google_identities_member_id_idx
  ON migimo_google_identities (member_id);

-- Category and location are completed later in Profile, never required at signup.
CREATE TABLE community_profiles (
  member_id uuid PRIMARY KEY REFERENCES migimo_members(id) ON DELETE CASCADE,
  member_category text CHECK (member_category IN ('PMI', 'PURNA_PMI', 'KELUARGA_PMI')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
