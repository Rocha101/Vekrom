import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const connectionString = process.env.DATABASE_URL ?? "postgres://vekrom:vekrom@localhost:5432/vekrom";
const max = Number(process.env.PGPOOL_MAX ?? "10");

// Pool real por padrão; initDb() troca para um banco pg-mem vazio se o Postgres estiver fora do ar.
export let pool: Pool = new Pool({
  connectionString,
  max,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

pool.on("error", (err) => {
  console.error("[db] idle client error", err);
});

export async function dbHealth(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export function isMemDb(): boolean {
  return memMode;
}

let memMode = false;

const here = dirname(fileURLToPath(import.meta.url));

/** Tenta Postgres real; cai para pg-mem vazio se indisponível. Chamar antes do listen. */
export async function initDb(): Promise<"postgres" | "memory"> {
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
    } finally {
      client.release();
    }
    console.log("[db] conectado em Postgres");
    return "postgres";
  } catch {
    console.log("[db] Postgres indisponível — usando pg-mem (modo sem Docker)");
  }
  const { newDb } = await import("pg-mem");
  const mem = newDb({ autoCreateForeignKeyIndices: true });
  let sql = await readFile(join(here, "..", "db", "schema.sql"), "utf8");
  sql = sql.replace(/CREATE EXTENSION[^;]+;/gi, "");
  // pg-mem não suporta GENERATED ... AS IDENTITY: troca por SERIAL
  sql = sql.replace(/BIGINT GENERATED ALWAYS AS IDENTITY/gi, "SERIAL");
  const statements = sql.split(";").map((s) => s.trim()).filter(Boolean);
  const { Pool: MemPool } = mem.adapters.createPg();
  const memPool = new MemPool();
  for (const st of statements) {
    try {
      await memPool.query(st);
    } catch (err) {
      console.error("[db:mem] statement ignorado:", String(st).slice(0, 80), "|", (err as Error).message);
    }
  }
  try {
    await pool.end().catch(() => undefined);
  } catch {
    /* noop */
  }
  pool = memPool as unknown as Pool;
  memMode = true;
  return "memory";
}
