import {
  createBook,
  findAllBooks,
  findBookById,
  updateBook,
} from "../services/book.service.js";

function sendError(response, error, fallbackMessage) {
  return response.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : fallbackMessage,
  });
}

export async function registerBook(request, response) {
  try {
    const book = await createBook(request.body);

    return response.status(201).json({
      message: "Livro cadastrado com sucesso.",
      book,
    });
  } catch (error) {
    return sendError(response, error, "Erro interno ao cadastrar livro.");
  }
}

export async function listBooks(request, response) {
  try {
    const books = await findAllBooks(request.query);
    return response.status(200).json({ books });
  } catch (error) {
    return sendError(response, error, "Erro interno ao consultar livros.");
  }
}

export async function showBook(request, response) {
  try {
    const book = await findBookById(request.params.id);
    return response.status(200).json({ book });
  } catch (error) {
    return sendError(response, error, "Erro interno ao consultar livro.");
  }
}

export async function editBook(request, response) {
  try {
    const book = await updateBook(request.params.id, request.body);

    return response.status(200).json({
      message: "Livro atualizado com sucesso.",
      book,
    });
  } catch (error) {
    return sendError(response, error, "Erro interno ao atualizar livro.");
  }
}
