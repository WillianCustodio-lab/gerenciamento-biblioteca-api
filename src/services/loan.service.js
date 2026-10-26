import { pool } from "../infrastructure/database/connection.js";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeId(id, entityName) {
  const normalizedId = Number(id);

  if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
    throw createError(`Identificador de ${entityName} inválido.`, 400);
  }

  return normalizedId;
}

function normalizeDueDate(dueDate) {
  if (typeof dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    throw createError("A data de devolução deve usar o formato AAAA-MM-DD.", 400);
  }

  const parsedDate = new Date(`${dueDate}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dueDate) {
    throw createError("Data de devolução inválida.", 400);
  }

  return dueDate;
}

export async function createLoan({ user_id, book_id, due_date } = {}) {
  const userId = normalizeId(user_id, "usuário");
  const bookId = normalizeId(book_id, "livro");
  const dueDate = normalizeDueDate(due_date);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      "SELECT id FROM users WHERE id = $1",
      [userId],
    );

    if (!userResult.rows[0]) {
      throw createError("Usuário não encontrado.", 404);
    }

    const bookResult = await client.query(
      `SELECT id, status
       FROM books
       WHERE id = $1
       FOR UPDATE`,
      [bookId],
    );

    if (!bookResult.rows[0]) {
      throw createError("Livro não encontrado.", 404);
    }

    if (bookResult.rows[0].status !== "available") {
      throw createError("O livro não está disponível para empréstimo.", 409);
    }

    const dateResult = await client.query(
      "SELECT $1::date > CURRENT_DATE AS is_valid",
      [dueDate],
    );

    if (!dateResult.rows[0].is_valid) {
      throw createError(
        "A data prevista para devolução deve ser posterior à data atual.",
        400,
      );
    }

    const loanResult = await client.query(
      `INSERT INTO loans (user_id, book_id, due_date)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, book_id, loan_date, due_date, returned_at, status`,
      [userId, bookId, dueDate],
    );

    await client.query(
      "UPDATE books SET status = 'loaned' WHERE id = $1",
      [bookId],
    );

    await client.query("COMMIT");
    return loanResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
