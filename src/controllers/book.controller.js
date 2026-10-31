import { findBookByIsbn } from "../infrastructure/integrations/open-library.client.js";

import {
  createBook,
  deleteBook,
  findAllBooks,
  findBookById,
  updateBook,
  importBook,
} from "../services/book.service.js";

export async function registerImportedBook(request, response, next) {
  try {
    const book = await importBook(request.body, findBookByIsbn);

    return response.status(201).json({
      message: "Livro importado e cadastrado com sucesso.",
      book,
    });
  } catch (error) {
    return next(error);
  }
}

export async function registerBook(request, response, next) {
  try {
    const book = await createBook(request.body);

    return response.status(201).json({
      message: "Livro cadastrado com sucesso.",
      book,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listBooks(request, response, next) {
  try {
    const books = await findAllBooks(request.query);
    return response.status(200).json({ books });
  } catch (error) {
    return next(error);
  }
}

export async function showBook(request, response, next) {
  try {
    const book = await findBookById(request.params.id);
    return response.status(200).json({ book });
  } catch (error) {
    return next(error);
  }
}

export async function editBook(request, response, next) {
  try {
    const book = await updateBook(request.params.id, request.body);

    return response.status(200).json({
      message: "Livro atualizado com sucesso.",
      book,
    });
  } catch (error) {
    return next(error);
  }
}

export async function removeBook(request, response, next) {
  try {
    const book = await deleteBook(request.params.id);

    return response.status(200).json({
      message: "Livro excluído com sucesso.",
      book,
    });
  } catch (error) {
    return next(error);
  }
}
