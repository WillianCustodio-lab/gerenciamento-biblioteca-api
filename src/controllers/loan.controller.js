import {
  createLoan,
  findAllLoans,
  findLoanById,
  returnLoan,
} from "../services/loan.service.js";

export async function registerLoan(request, response, next) {
  try {
    const loan = await createLoan(request.body);

    return response.status(201).json({
      message: "Empréstimo registrado com sucesso.",
      loan,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listLoans(request, response, next) {
  try {
    const loans = await findAllLoans(request.query, request.user);
    return response.status(200).json({ loans });
  } catch (error) {
    return next(error);
  }
}

export async function showLoan(request, response, next) {
  try {
    const loan = await findLoanById(request.params.id, request.user);
    return response.status(200).json({ loan });
  } catch (error) {
    return next(error);
  }
}

export async function returnRegisteredLoan(request, response, next) {
  try {
    const loan = await returnLoan(request.params.id);

    return response.status(200).json({
      message: "Devolução registrada com sucesso.",
      loan,
    });
  } catch (error) {
    return next(error);
  }
}
