import { afterAll, beforeAll } from "vitest";
import pg from "pg";

const ADMIN_URL =
  process.env.DATABASE_URL ??
  "postgres://kivikova:kivikova_dev@localhost:5432/kivikova";
const TEST_DB = `kivikova_test_${Date.now()}`;
const parsed = new URL(ADMIN_URL);
parsed.pathname = `/${TEST_DB}`;
const TEST_URL = parsed.toString();

let adminPool: pg.Pool;

beforeAll(async () => {
  adminPool = new pg.Pool({ connectionString: ADMIN_URL });
  await adminPool.query(`CREATE DATABASE "${TEST_DB}"`);

  process.env.DATABASE_URL = TEST_URL;
  process.env.QDRANT_URL = "http://localhost:6333";
  process.env.MEETING_BOT_PROVIDER = "mock";

  const pool = new pg.Pool({ connectionString: TEST_URL });
  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE meeting_status AS ENUM ('pending','joining','active','processing','completed','failed');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS meetings (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      title TEXT NOT NULL,
      join_link TEXT NOT NULL,
      status meeting_status DEFAULT 'pending' NOT NULL,
      qdrant_collection_name TEXT NOT NULL,
      participants JSONB DEFAULT '[]',
      metadata JSONB DEFAULT '{}',
      started_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );
  `);
  await pool.end();
});

afterAll(async () => {
  await adminPool.query(`DROP DATABASE IF EXISTS "${TEST_DB}" WITH (FORCE)`);
  await adminPool.end();
});
