import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { getEnv } from "@/lib/env";

const pool = new pg.Pool({
  connectionString: getEnv().DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export async function closeDbPool() {
  await pool.end();
}
