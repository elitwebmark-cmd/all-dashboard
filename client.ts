import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Єдиний клієнт Postgres. Якщо DATABASE_URL не заданий — повертає null,
 * і застосунок працює на демо-сіді (data/seed.json). Це дозволяє
 * запускати дешборд без бази (демо) і з базою (продакшн) без змін коду.
 */
const url = process.env.DATABASE_URL;

export const hasDatabase = Boolean(url);

let _sql: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!url) return null;
  if (!_db) {
    _sql = postgres(url, { max: 5, prepare: false });
    _db = drizzle(_sql, { schema });
  }
  return _db;
}

export { schema };
