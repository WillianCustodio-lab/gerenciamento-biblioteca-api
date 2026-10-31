import { pool } from "../infrastructure/database/connection.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function findUserById(id) {
  const result = await pool.query(
    `SELECT id, name, email, role, created_at
     FROM users
     WHERE id = $1`,
    [id],
  );

  return result.rows[0];
}

export async function findAllUsers() {
  const result = await pool.query(
    `SELECT id, name, email, role, created_at
     FROM users
     ORDER BY id`,
  );

  return result.rows;
}

export async function updateUser(id, data = {}) {
  if (
    !data ||
    typeof data.name !== "string" ||
    typeof data.email !== "string" ||
    !data.name.trim() ||
    !data.email.trim()
  ) {
    throw createError("Nome e e-mail são obrigatórios.", 400);
  }

  const name = data.name.trim();
  const email = data.email.trim().toLowerCase();

  if (name.length > 120 || email.length > 255) {
    throw createError(
      "O nome deve ter até 120 caracteres e o e-mail até 255.",
      400,
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError("Informe um e-mail válido.", 400);
  }

  const existingUser = await pool.query(
    "SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1",
    [email, id],
  );

  if (existingUser.rows[0]) {
    throw createError("E-mail já cadastrado para outro usuário.", 409);
  }

  const result = await pool.query(
    `UPDATE users
     SET name = $1,
         email = $2
     WHERE id = $3
     RETURNING id, name, email, role, created_at`,
    [name, email, id],
  );

  if (!result.rows[0]) {
    throw createError("Usuário não encontrado.", 404);
  }

  return result.rows[0];
}
