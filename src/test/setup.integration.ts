import { afterAll, beforeAll } from "vitest";
import pg from "pg";

const ADMIN_URL =
  process.env.DATABASE_URL ??
  "postgres://vernix:vernix_dev@localhost:5432/vernix";
const TEST_DB = `vernix_test_${Date.now()}`;
const parsed = new URL(ADMIN_URL);
parsed.pathname = `/${TEST_DB}`;
const TEST_URL = parsed.toString();
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

let adminPool: pg.Pool;

beforeAll(async () => {
  adminPool = new pg.Pool({ connectionString: ADMIN_URL });
  await adminPool.query(`CREATE DATABASE "${TEST_DB}"`);

  process.env.DATABASE_URL = TEST_URL;
  process.env.QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6380";
  process.env.MEETING_BOT_PROVIDER = "mock";

  const pool = new pg.Pool({ connectionString: TEST_URL });
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    DO $$ BEGIN
      CREATE TYPE meeting_status AS ENUM ('pending','joining','active','processing','completed','failed');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
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
  await pool.query(
    `
      INSERT INTO users (id, email, name, password_hash)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING
    `,
    [TEST_USER_ID, "integration-test@example.com", "Integration Test", "hash"]
  );
  await pool.end();
});

afterAll(async () => {
  try {
    const dbModule = await import("@/lib/db");
    await dbModule.closeDbPool();
  } catch {
    // Ignore if DB module was never imported by tests.
  }
  await adminPool.query(`DROP DATABASE IF EXISTS "${TEST_DB}" WITH (FORCE)`);
  await adminPool.end();
});
