-- Run after 001_identity.sql in the same new development database.
-- Financial transactions and App credentials remain outside Community V1.
CREATE TABLE community_posts (
  id uuid PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES migimo_members(id) ON DELETE RESTRICT,
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 3000),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX community_posts_feed_idx ON community_posts (created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE community_comments (
  id uuid PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES migimo_members(id) ON DELETE RESTRICT,
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX community_comments_post_idx ON community_comments (post_id, created_at)
  WHERE deleted_at IS NULL;

CREATE TABLE community_reactions (
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES migimo_members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, member_id)
);
