import { fileURLToPath } from "node:url";
import { runner } from "node-pg-migrate";
import { pool } from "../../src/infrastructure/database/connection.js";

async function assertTestDatabase() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Operação permitida somente no ambiente de testes.");
  }

  const connectionString = pool.options.connectionString;
  const url = new URL(connectionString);

  const isTestDatabase =
    connectionString === process.env.DATABASE_URL &&
    url.protocol === "postgresql:" &&
    url.hostname === "127.0.0.1" &&
    url.port === "5434" &&
    url.pathname === "/biblioteca_test" &&
    url.username === "biblioteca_test";

  if (!isTestDatabase) {
    throw new Error("Conexão recusada: não é o banco exclusivo de testes.");
  }

  const result = await pool.query(`
    SELECT current_database() AS database,
           current_user AS username
  `);

  const identity = result.rows[0];

  if (
    identity.database !== "biblioteca_test" ||
    identity.username !== "biblioteca_test"
  ) {
    throw new Error("O PostgreSQL conectado não corresponde ao ambiente esperado.");
  }
}

export async function prepareDatabase() {
  await assertTestDatabase();

  const client = await pool.connect();

  try {
    await runner({
      dbClient: client,
      dir: fileURLToPath(new URL("../../migrations/", import.meta.url)),
      direction: "up",
      migrationsTable: "pgmigrations",
    });
  } finally {
    client.release();
  }
}

export async function cleanDatabase() {
  await assertTestDatabase();

  await pool.query(`
    TRUNCATE TABLE loans, books, users RESTART IDENTITY
  `);
}

export async function closeDatabase() {
  await pool.end();
}