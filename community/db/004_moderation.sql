-- Community moderation only. Financial transaction data is not stored here.
CREATE TABLE community_member_moderation (
  member_id uuid PRIMARY KEY REFERENCES migimo_members(id) ON DELETE CASCADE,
  suspended_at timestamptz NOT NULL DEFAULT now(),
  suspended_by uuid NOT NULL REFERENCES migimo_members(id) ON DELETE RESTRICT
);

CREATE TABLE community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES migimo_members(id) ON DELETE RESTRICT,
  target_kind text NOT NULL CHECK (target_kind IN ('post', 'comment')),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 3 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES migimo_members(id) ON DELETE RESTRICT
);
CREATE INDEX community_reports_open_idx ON community_reports (created_at DESC) WHERE resolved_at IS NULL;
CREATE UNIQUE INDEX community_reports_one_open_per_member_idx
  ON community_reports (reporter_id, target_kind, target_id) WHERE resolved_at IS NULL;

CREATE TABLE community_moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES migimo_members(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('suspend', 'restore_member', 'hide', 'restore_content', 'resolve_report')),
  target_kind text NOT NULL CHECK (target_kind IN ('member', 'post', 'comment', 'report')),
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX community_moderation_actions_recent_idx ON community_moderation_actions (created_at DESC);
