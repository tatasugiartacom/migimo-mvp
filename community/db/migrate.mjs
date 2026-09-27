import { readFile } from 'node:fs/promises';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required for migrations');

const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000 });
const migrations = ['001_identity.sql', '002_posts.sql', '003_avatars.sql'];

try {
  await client.connect();
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(617712698)');
  await client.query(`CREATE TABLE IF NOT EXISTS community_schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  for (const name of migrations) {
    const alreadyApplied = await client.query('SELECT 1 FROM community_schema_migrations WHERE name = $1', [name]);
    if (alreadyApplied.rowCount) continue;
    const sql = await readFile(new URL(name, import.meta.url), 'utf8');
    await client.query(sql);
    await client.query('INSERT INTO community_schema_migrations (name) VALUES ($1)', [name]);
    console.log(`Applied ${name}`);
  }
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  await client.end().catch(() => {});
}
