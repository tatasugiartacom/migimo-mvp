-- Optional member photo, kept separate from identity and visible only to signed-in members.
CREATE TABLE community_avatars (
  member_id uuid PRIMARY KEY REFERENCES migimo_members(id) ON DELETE CASCADE,
  image_data bytea NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
