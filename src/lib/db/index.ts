import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { getEnv } from "@/lib/env";

let pool: pg.Pool | null = null;
let _db: NodePgDatabase<typeof schema> | null = null;

function getDb(): NodePgDatabase<typeof schema> {
  if (!_db) {
    pool = new pg.Pool({ connectionString: getEnv().DATABASE_URL });
    _db = drizzle(pool, { schema });
  }
  return _db;
}

// Lazy proxy: defers pool/env initialization until first property access
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export async function closeDbPool() {
  if (pool) await pool.end();
}
