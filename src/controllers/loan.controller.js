import {
  createLoan,
  findAllLoans,
  findLoanById,
  returnLoan,
} from "../services/loan.service.js";

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

export async function listLoans(request, response) {
  try {
    const loans = await findAllLoans(request.query, request.user);
    return response.status(200).json({ loans });
  } catch (error) {
    return sendError(response, error, "Erro interno ao consultar empréstimos.");
  }
}

export async function showLoan(request, response) {
  try {
    const loan = await findLoanById(request.params.id, request.user);
    return response.status(200).json({ loan });
  } catch (error) {
    return sendError(response, error, "Erro interno ao consultar empréstimo.");
  }
}

export async function returnRegisteredLoan(request, response) {
  try {
    const loan = await returnLoan(request.params.id);

    return response.status(200).json({
      message: "Devolução registrada com sucesso.",
      loan,
    });
  } catch (error) {
    return sendError(response, error, "Erro interno ao registrar devolução.");
  }
}
