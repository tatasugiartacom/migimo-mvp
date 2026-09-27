import { db } from './data.mjs';

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function adminOverview() {
  const { rows } = await db().query(`SELECT
    (SELECT count(*)::int FROM migimo_members) AS members,
    (SELECT count(*)::int FROM community_member_moderation) AS suspended,
    (SELECT count(*)::int FROM community_posts WHERE deleted_at IS NULL) AS posts,
    (SELECT count(*)::int FROM community_comments WHERE deleted_at IS NULL) AS comments,
    (SELECT count(*)::int FROM community_reports WHERE resolved_at IS NULL) AS open_reports`);
  return rows[0];
}

export async function adminMembers(search = '') {
  const { rows } = await db().query(`
    SELECT m.id, m.full_name_ktp AS name, g.email, p.member_category AS category,
           m.created_at, (s.member_id IS NOT NULL) AS suspended
    FROM migimo_members m
    JOIN migimo_google_identities g ON g.member_id = m.id
    LEFT JOIN community_profiles p ON p.member_id = m.id
    LEFT JOIN community_member_moderation s ON s.member_id = m.id
    WHERE $1 = '' OR m.full_name_ktp ILIKE '%' || $1 || '%' OR g.email ILIKE '%' || $1 || '%'
    ORDER BY m.created_at DESC LIMIT 60`, [search]);
  return rows;
}

export async function adminContent() {
  const { rows } = await db().query(`
    SELECT 'post' AS kind, p.id, p.body, m.full_name_ktp AS author_name, p.author_id,
           p.created_at, p.deleted_at, p.id AS post_id
    FROM community_posts p JOIN migimo_members m ON m.id = p.author_id
    UNION ALL
    SELECT 'comment' AS kind, c.id, c.body, m.full_name_ktp AS author_name, c.author_id,
           c.created_at, c.deleted_at, c.post_id
    FROM community_comments c JOIN migimo_members m ON m.id = c.author_id
    ORDER BY created_at DESC LIMIT 80`);
  return rows;
}

export async function adminReports() {
  const { rows } = await db().query(`
    SELECT r.id, r.target_kind, r.target_id, r.reason, r.created_at, r.resolved_at,
           m.full_name_ktp AS reporter_name,
           CASE WHEN r.target_kind = 'post' THEN p.body ELSE c.body END AS target_body,
           CASE WHEN r.target_kind = 'post' THEN p.deleted_at ELSE c.deleted_at END AS target_deleted_at
    FROM community_reports r
    JOIN migimo_members m ON m.id = r.reporter_id
    LEFT JOIN community_posts p ON r.target_kind = 'post' AND p.id = r.target_id
    LEFT JOIN community_comments c ON r.target_kind = 'comment' AND c.id = r.target_id
    ORDER BY (r.resolved_at IS NOT NULL), r.created_at DESC LIMIT 80`);
  return rows;
}

export async function submitReport(reporterId, kind, targetId, postId, reason) {
  const table = kind === 'post' ? 'community_posts' : 'community_comments';
  const target = await db().query(`SELECT id FROM ${table}
    WHERE id = $1 AND ${kind === 'post' ? 'id' : 'post_id'} = $2
      AND author_id <> $3 AND deleted_at IS NULL`, [targetId, postId, reporterId]);
  if (!target.rowCount) return false;
  const { rowCount } = await db().query(`
    INSERT INTO community_reports (reporter_id, target_kind, target_id, reason)
    SELECT $1, $2, id, $4 FROM ${table}
    WHERE id = $3 AND ${kind === 'post' ? 'id' : 'post_id'} = $5
      AND author_id <> $1 AND deleted_at IS NULL
    ON CONFLICT (reporter_id, target_kind, target_id) WHERE resolved_at IS NULL DO NOTHING`,
  [reporterId, kind, targetId, reason, postId]);
  if (rowCount === 1) return true;
  const existing = await db().query(`SELECT 1 FROM community_reports
    WHERE reporter_id = $1 AND target_kind = $2 AND target_id = $3 AND resolved_at IS NULL`,
  [reporterId, kind, targetId]);
  return existing.rowCount === 1;
}

async function moderated(actorId, action, kind, targetId, change) {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const changed = await change(client);
    if (changed) await client.query(`INSERT INTO community_moderation_actions
      (actor_id, action, target_kind, target_id) VALUES ($1, $2, $3, $4)`, [actorId, action, kind, targetId]);
    await client.query('COMMIT');
    return changed;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function moderateMember(actorId, memberId, action) {
  if (memberId === actorId) return false;
  return moderated(actorId, action, 'member', memberId, async client => {
    if (action === 'suspend') {
      const result = await client.query(`INSERT INTO community_member_moderation (member_id, suspended_by)
        SELECT id, $2 FROM migimo_members WHERE id = $1
        ON CONFLICT (member_id) DO NOTHING`, [memberId, actorId]);
      return result.rowCount === 1;
    }
    const result = await client.query('DELETE FROM community_member_moderation WHERE member_id = $1', [memberId]);
    return result.rowCount === 1;
  });
}

export async function moderateContent(actorId, kind, targetId, action) {
  const table = kind === 'post' ? 'community_posts' : 'community_comments';
  const hidden = action === 'hide';
  return moderated(actorId, action, kind, targetId, async client => {
    const result = await client.query(`UPDATE ${table} SET deleted_at = ${hidden ? 'now()' : 'NULL'}
      WHERE id = $1 AND deleted_at IS ${hidden ? 'NULL' : 'NOT NULL'}`, [targetId]);
    return result.rowCount === 1;
  });
}

export async function resolveReport(actorId, reportId) {
  return moderated(actorId, 'resolve_report', 'report', reportId, async client => {
    const result = await client.query(`UPDATE community_reports SET resolved_at = now(), resolved_by = $2
      WHERE id = $1 AND resolved_at IS NULL`, [reportId, actorId]);
    return result.rowCount === 1;
  });
}
