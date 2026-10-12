import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword } from "./auth.js";

const connectionString = process.env.DATABASE_URL ?? "postgres://vekrom:vekrom@localhost:5432/vekrom";
const max = Number(process.env.PGPOOL_MAX ?? "10");

// Pool real por padrão; initDb() troca para pg-mem se o Postgres estiver fora do ar.
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

/** Tenta Postgres real; cai para pg-mem (com seed demo) se indisponível. Chamar antes do listen. */
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
  await seedDemo();
  return "memory";
}

/** Seed demo: demo@vekrom.gg / password123 + servidor + canais + boas-vindas. */
async function seedDemo(): Promise<void> {
  const passwordHash = await hashPassword("password123");
  const u = await pool.query(
    `INSERT INTO users (username, discriminator, email, password_hash) VALUES ('demo','0001','demo@vekrom.gg',$1)
     ON CONFLICT (email) DO UPDATE SET username=EXCLUDED.username RETURNING id`,
    [passwordHash],
  );
  const uid = u.rows[0].id;
  const s = await pool.query(`INSERT INTO servers (name, owner_id) VALUES ('Vekrom', $1) RETURNING id`, [uid]);
  const sid = s.rows[0].id;
  await pool.query(`INSERT INTO server_members (server_id, user_id, status) VALUES ($1,$2,'member') ON CONFLICT DO NOTHING`, [sid, uid]);
  const c1 = await pool.query(
    `INSERT INTO channels (server_id, name, type, position) VALUES ($1,'geral','text',0) RETURNING id`,
    [sid],
  );
  await pool.query(`INSERT INTO channels (server_id, name, type, position) VALUES ($1,'Voz Geral','voice',1)`, [sid]);
  await pool.query(`INSERT INTO roles (server_id, name, permissions, position) VALUES ($1,'admin',1,100)`, [sid]);
  await pool.query(`INSERT INTO messages (channel_id, author_id, content) VALUES ($1,$2,'Bem-vindo ao Vekrom! Modo sem Docker ativo.')`, [
    c1.rows[0].id,
    uid,
  ]);
  console.log("[db:mem] seed demo pronto (demo@vekrom.gg / password123)");
}
