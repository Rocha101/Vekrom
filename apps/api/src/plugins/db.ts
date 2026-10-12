import pg from "pg";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";
import { hashPassword } from "./auth.js";

// BIGINT/COUNT chegam como string (ids nunca perdem precisão no JS).
export let pool: pg.Pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: config.PGPOOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 10_000,
  application_name: "vekrom-api",
});

pool.on("error", (err) => {
  console.error("[db] erro em cliente ocioso:", err.message);
});

export async function dbHealth(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Conecta no Postgres. Em produção falha alto (o systemd reinicia e o log mostra o motivo).
 * Só fora de produção cai para pg-mem com seed demo, para rodar sem Docker.
 */
export async function initDb(): Promise<"postgres" | "memory"> {
  try {
    await pool.query("SELECT 1");
    console.log("[db] conectado em Postgres");
    return "postgres";
  } catch (err) {
    if (config.isProd) {
      console.error("[db] Postgres indisponível em produção — abortando:", (err as Error).message);
      throw err;
    }
    console.warn("[db] Postgres indisponível — usando pg-mem (só dev)");
  }
  const { newDb } = await import("pg-mem");
  const mem = newDb({ autoCreateForeignKeyIndices: true });
  // schema.sql fica em src/db; rodando via tsx `here` já é src/plugins.
  let sql = await readFile(join(here, "..", "db", "schema.sql"), "utf8");
  sql = sql.replace(/CREATE EXTENSION[^;]+;/gi, "");
  sql = sql.replace(/BIGINT GENERATED ALWAYS AS IDENTITY/gi, "SERIAL");
  sql = sql.replace(/,\s*FOREIGN KEY \(server_id, user_id\)[^\n]+/g, ""); // pg-mem não tem FK composta
  const { Pool: MemPool } = mem.adapters.createPg();
  const memPool = new MemPool();
  for (const st of sql.split(";").map((s) => s.trim()).filter(Boolean)) {
    try {
      await memPool.query(st);
    } catch (err) {
      console.warn("[db:mem] statement ignorado:", String(st).slice(0, 60), "|", (err as Error).message);
    }
  }
  await pool.end().catch(() => undefined);
  pool = memPool as unknown as pg.Pool;
  await seedDemo();
  return "memory";
}

/** Seed demo (só pg-mem): demo / demo@vekrom.gg / password123. */
async function seedDemo(): Promise<void> {
  const passwordHash = await hashPassword("password123");
  const u = await pool.query(
    `INSERT INTO users (username, discriminator, email, password_hash) VALUES ('demo','0001','demo@vekrom.gg',$1) RETURNING id`,
    [passwordHash],
  );
  const uid = u.rows[0].id;
  const s = await pool.query(`INSERT INTO servers (name, owner_id) VALUES ('Vekrom', $1) RETURNING id`, [uid]);
  const sid = s.rows[0].id;
  await pool.query(`INSERT INTO server_members (server_id, user_id, status) VALUES ($1,$2,'member')`, [sid, uid]);
  const c1 = await pool.query(`INSERT INTO channels (server_id, name, type, position) VALUES ($1,'geral','text',0) RETURNING id`, [sid]);
  await pool.query(`INSERT INTO channels (server_id, name, type, position) VALUES ($1,'Voz Geral','voice',1)`, [sid]);
  await pool.query(`INSERT INTO messages (channel_id, author_id, content) VALUES ($1,$2,'Bem-vindo ao Vekrom! Modo sem Docker ativo.')`, [c1.rows[0].id, uid]);
  console.log("[db:mem] seed demo pronto (demo@vekrom.gg / password123)");
}
