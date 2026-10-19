import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { pool } from "../infrastructure/database/connection.js";
import jwt from "jsonwebtoken";
import { sendPasswordResetEmail } from "../infrastructure/email/mailer.js";

export async function registerUser({ name, email, password } = {}) {
  if (!name || !email || !password) {
    const error = new Error("Nome, e-mail e senha são obrigatórios.");
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 8) {
    const error = new Error("A senha deve possuir pelo menos 8 caracteres.");
    error.statusCode = 400;
    throw error;
  }

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [normalizedEmail],
  );

  if (existingUser.rowCount > 0) {
    const error = new Error("E-mail já cadastrado.");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, role, created_at`,
    [normalizedName, normalizedEmail, passwordHash],
  );

  return result.rows[0];
}

export async function loginUser({ email, password } = {}) {
  if (!email || !password) {
    const error = new Error("E-mail e senha são obrigatórios.");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const result = await pool.query(
    `SELECT id, name, email, password_hash, role
     FROM users
     WHERE email = $1`,
    [normalizedEmail],
  );

  const user = result.rows[0];

  if (!user) {
    const error = new Error("E-mail ou senha inválidos.");
    error.statusCode = 401;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.password_hash,
  );

  if (!passwordMatches) {
    const error = new Error("E-mail ou senha inválidos.");
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      subject: String(user.id),
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    },
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function requestPasswordReset({ email } = {}) {
  if (!email || typeof email !== "string") {
    const error = new Error("E-mail é obrigatório.");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const result = await pool.query(
    "SELECT id, name, email FROM users WHERE email = $1",
    [normalizedEmail],
  );

  const user = result.rows[0];

  if (!user) {
    return;
  }

  const resetToken = randomBytes(32).toString("hex");
  const resetTokenHash = createHash("sha256")
    .update(resetToken)
    .digest("hex");
  const resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await pool.query(
    `UPDATE users
     SET password_reset_token_hash = $1,
         password_reset_expires_at = $2
     WHERE id = $3`,
    [resetTokenHash, resetExpiresAt, user.id],
  );

  try {
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      token: resetToken,
    });
  } catch (error) {
    await pool.query(
      `UPDATE users
       SET password_reset_token_hash = NULL,
           password_reset_expires_at = NULL
       WHERE id = $1`,
      [user.id],
    );

    throw error;
  }
}

export async function resetPassword({ token, password } = {}) {
  if (
    !token ||
    typeof token !== "string" ||
    !password ||
    typeof password !== "string"
  ) {
    const error = new Error("Token e nova senha são obrigatórios.");
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 8) {
    const error = new Error("A senha deve possuir pelo menos 8 caracteres.");
    error.statusCode = 400;
    throw error;
  }

  const resetTokenHash = createHash("sha256")
    .update(token)
    .digest("hex");

  const result = await pool.query(
    `SELECT id
     FROM users
     WHERE password_reset_token_hash = $1
       AND password_reset_expires_at > NOW()`,
    [resetTokenHash],
  );

  const user = result.rows[0];

  if (!user) {
    const error = new Error("Token de recuperação inválido ou expirado.");
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await pool.query(
    `UPDATE users
     SET password_hash = $1,
         password_reset_token_hash = NULL,
         password_reset_expires_at = NULL
     WHERE id = $2`,
    [passwordHash, user.id],
  );
}
