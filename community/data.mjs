import pg from 'pg';

let pool;
export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  pool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 5000 });
  return pool;
}

export async function findMember(googleSub) {
  const { rows } = await db().query(`
    SELECT m.id, m.full_name_ktp AS name, p.member_category AS category,
           EXISTS(SELECT 1 FROM community_member_moderation s WHERE s.member_id = m.id) AS suspended,
           EXISTS(SELECT 1 FROM community_avatars a WHERE a.member_id = m.id) AS has_avatar
    FROM migimo_google_identities g
    JOIN migimo_members m ON m.id = g.member_id
    LEFT JOIN community_profiles p ON p.member_id = m.id
    WHERE g.google_sub = $1`, [googleSub]);
  return rows[0] ?? null;
}

export async function memberById(id) {
  const { rows } = await db().query(`
    SELECT m.id, m.full_name_ktp AS name, p.member_category AS category,
           EXISTS(SELECT 1 FROM community_member_moderation s WHERE s.member_id = m.id) AS suspended,
           EXISTS(SELECT 1 FROM community_avatars a WHERE a.member_id = m.id) AS has_avatar
    FROM migimo_members m LEFT JOIN community_profiles p ON p.member_id = m.id
    WHERE m.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function registerMember({ sub, email, name }) {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const previous = await client.query('SELECT member_id FROM migimo_google_identities WHERE google_sub = $1', [sub]);
    if (previous.rows[0]) {
      await client.query('COMMIT');
      return memberById(previous.rows[0].member_id);
    }
    const created = await client.query('INSERT INTO migimo_members (id, full_name_ktp) VALUES (gen_random_uuid(), $1) RETURNING id', [name]);
    await client.query('INSERT INTO migimo_google_identities (google_sub, member_id, email, email_verified) VALUES ($1, $2, $3, true)', [sub, created.rows[0].id, email]);
    await client.query('INSERT INTO community_profiles (member_id) VALUES ($1)', [created.rows[0].id]);
    await client.query('COMMIT');
    return { id: created.rows[0].id, name, category: null, has_avatar: false };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return findMember(sub);
    throw error;
  } finally { client.release(); }
}

export async function updateCategory(memberId, category) {
  const { rowCount } = await db().query(
    'UPDATE community_profiles SET member_category = $1, updated_at = now() WHERE member_id = $2',
    [category, memberId]
  );
  return rowCount === 1;
}

export async function saveAvatar(memberId, image) {
  await db().query(`
    INSERT INTO community_avatars (member_id, image_data) VALUES ($1, $2)
    ON CONFLICT (member_id) DO UPDATE SET image_data = EXCLUDED.image_data, updated_at = now()`,
    [memberId, image]);
}

export async function getAvatar(memberId) {
  const { rows } = await db().query('SELECT image_data FROM community_avatars WHERE member_id = $1', [memberId]);
  return rows[0]?.image_data ?? null;
}

export async function listPosts(category = null, memberId) {
  const { rows } = await db().query(`
    SELECT p.id, p.body, p.created_at, m.full_name_ktp AS author_name, p.author_id,
           c.member_category AS author_category,
           EXISTS(SELECT 1 FROM community_avatars a WHERE a.member_id = p.author_id) AS author_has_avatar,
           (SELECT count(*)::int FROM community_comments x WHERE x.post_id = p.id AND x.deleted_at IS NULL) AS comments,
           (SELECT count(*)::int FROM community_reactions x WHERE x.post_id = p.id) AS reactions,
           EXISTS(SELECT 1 FROM community_reactions x WHERE x.post_id = p.id AND x.member_id = $2) AS liked
    FROM community_posts p
    JOIN migimo_members m ON m.id = p.author_id
    LEFT JOIN community_profiles c ON c.member_id = p.author_id
    WHERE p.deleted_at IS NULL AND ($1::text IS NULL OR c.member_category = $1)
    ORDER BY p.created_at DESC LIMIT 50`, [category, memberId]);
  return rows;
}

export async function createPost(memberId, body) {
  await db().query('INSERT INTO community_posts (id, author_id, body) VALUES (gen_random_uuid(), $1, $2)', [memberId, body]);
}

export async function getPost(id, memberId) {
  const { rows } = await db().query(`
    SELECT p.id, p.body, p.created_at, m.full_name_ktp AS author_name, p.author_id,
           c.member_category AS author_category,
           EXISTS(SELECT 1 FROM community_avatars a WHERE a.member_id = p.author_id) AS author_has_avatar,
           (SELECT count(*)::int FROM community_comments x WHERE x.post_id = p.id AND x.deleted_at IS NULL) AS comments,
           (SELECT count(*)::int FROM community_reactions x WHERE x.post_id = p.id) AS reactions,
           EXISTS(SELECT 1 FROM community_reactions x WHERE x.post_id = p.id AND x.member_id = $2) AS liked
    FROM community_posts p JOIN migimo_members m ON m.id = p.author_id
    LEFT JOIN community_profiles c ON c.member_id = p.author_id
    WHERE p.id = $1 AND p.deleted_at IS NULL`, [id, memberId]);
  return rows[0] ?? null;
}

export async function listComments(postId) {
  const { rows } = await db().query(`
    SELECT c.id, c.body, c.created_at, m.full_name_ktp AS author_name, c.author_id,
           EXISTS(SELECT 1 FROM community_avatars a WHERE a.member_id = c.author_id) AS author_has_avatar
    FROM community_comments c JOIN migimo_members m ON m.id = c.author_id
    WHERE c.post_id = $1 AND c.deleted_at IS NULL
    ORDER BY c.created_at ASC LIMIT 100`, [postId]);
  return rows;
}

export async function addComment(postId, memberId, body) {
  const { rowCount } = await db().query(`
    INSERT INTO community_comments (id, post_id, author_id, body)
    SELECT gen_random_uuid(), id, $2, $3 FROM community_posts
    WHERE id = $1 AND deleted_at IS NULL`, [postId, memberId, body]);
  return rowCount === 1;
}

export async function toggleReaction(postId, memberId) {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const post = await client.query('SELECT id FROM community_posts WHERE id = $1 AND deleted_at IS NULL FOR SHARE', [postId]);
    if (!post.rowCount) { await client.query('ROLLBACK'); return false; }
    const deleted = await client.query('DELETE FROM community_reactions WHERE post_id = $1 AND member_id = $2', [postId, memberId]);
    if (!deleted.rowCount) await client.query('INSERT INTO community_reactions (post_id, member_id) VALUES ($1, $2)', [postId, memberId]);
    await client.query('COMMIT');
    return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
