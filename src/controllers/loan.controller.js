import { createLoan } from "../services/loan.service.js";

function sendError(response, error, fallbackMessage) {
  return response.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : fallbackMessage,
  });
}

export async function registerLoan(request, response) {
  try {
    const loan = await createLoan(request.body);

    return response.status(201).json({
      message: "Empréstimo registrado com sucesso.",
      loan,
    });
  } catch (error) {
    return sendError(response, error, "Erro interno ao registrar empréstimo.");
  }
}
