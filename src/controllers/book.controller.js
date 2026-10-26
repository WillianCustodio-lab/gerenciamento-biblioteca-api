import { createBook } from "../services/book.service.js";

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
