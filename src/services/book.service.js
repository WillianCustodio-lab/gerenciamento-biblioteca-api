import { pool } from "../infrastructure/database/connection.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeBookData({ title, author, isbn } = {}) {
  if (
    typeof title !== "string" ||
    typeof author !== "string" ||
    typeof isbn !== "string" ||
    !title.trim() ||
    !author.trim() ||
    !isbn.trim()
  ) {
    throw createError("Título, autor e ISBN são obrigatórios.", 400);
  }

  const normalizedTitle = title.trim();
  const normalizedAuthor = author.trim();
  const normalizedIsbn = isbn.replace(/[\s-]/g, "").toUpperCase();

  const isbnIsValid =
    /^\d{13}$/.test(normalizedIsbn) ||
    /^\d{9}[\dX]$/.test(normalizedIsbn);

  if (!isbnIsValid) {
    throw createError(
      "O ISBN deve possuir 10 ou 13 caracteres válidos.",
      400,
    );
  }

  return {
    title: normalizedTitle,
    author: normalizedAuthor,
    isbn: normalizedIsbn,
  };
}

export async function createBook(data) {
  const { title, author, isbn } = normalizeBookData(data);

  const result = await pool.query(
    `INSERT INTO books (title, author, isbn)
     VALUES ($1, $2, $3)
     RETURNING id, title, author, isbn, status, created_at`,
    [title, author, isbn],
  );

  return result.rows[0];
}

export async function findAllBooks({ status } = {}) {
  const allowedStatuses = ["available", "loaned"];

  if (status !== undefined && !allowedStatuses.includes(status)) {
    throw createError("Status de livro inválido.", 400);
  }

  const values = [];
  let query = `
    SELECT id, title, author, isbn, status, created_at
    FROM books
  `;

  if (status) {
    query += " WHERE status = $1";
    values.push(status);
  }

  query += " ORDER BY id";

  const result = await pool.query(query, values);
  return result.rows;
}
