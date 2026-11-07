import bcrypt from "bcryptjs";
import { pool } from "../infrastructure/database/connection.js";
import { isValidEmail } from "../utils/email.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function createAdministrator({ name, email, password } = {}) {
  if (
    typeof name !== "string" || !name.trim() ||
    typeof email !== "string" || !email.trim() ||
    typeof password !== "string" || !password
  ) {
    throw createError("Nome, e-mail e senha são obrigatórios.", 400);
  }

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedName.length > 120 || normalizedEmail.length > 255) {
    throw createError("O nome deve ter até 120 caracteres e o e-mail até 255.", 400);
  }

  if (!isValidEmail(normalizedEmail)) {
    throw createError("Informe um e-mail válido.", 400);
  }

  if (password.length < 8 || bcrypt.truncates(password)) {
    throw createError("A senha deve possuir pelo menos 8 caracteres e no máximo 72 bytes.", 400);
  }

  const duplicateMessage =
    "E-mail já cadastrado. Nenhuma conta foi alterada. Utilize um e-mail ainda não cadastrado.";
  const existingUser = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [normalizedEmail],
  );

  if (existingUser.rows[0]) {
    throw createError(duplicateMessage, 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id, name, email, role, created_at`,
      [normalizedName, normalizedEmail, passwordHash],
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      throw createError(duplicateMessage, 409);
    }
    throw error;
  }
}
