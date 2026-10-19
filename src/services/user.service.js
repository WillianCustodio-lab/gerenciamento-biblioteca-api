import { pool } from "../infrastructure/database/connection.js";

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
