export function notFound(request, response) {
  return response.status(404).json({
    message: "Rota não encontrada.",
  });
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  if (error.type === "entity.parse.failed") {
    return response.status(400).json({
      message: "O corpo da requisição contém um JSON inválido.",
    });
  }

  if (error.type === "entity.too.large") {
    return response.status(413).json({
      message: "O corpo da requisição excede o tamanho permitido.",
    });
  }

  if (error.code === "23505") {
    return response.status(409).json({
      message: "Já existe um registro com esses dados únicos.",
    });
  }

  if (error.code === "23503") {
    return response.status(409).json({
      message: "A operação conflita com registros relacionados.",
    });
  }

  const hasExpectedStatus =
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599;

  if (hasExpectedStatus) {
    return response.status(error.statusCode).json({
      message: error.message,
    });
  }

  console.error("Erro inesperado na aplicação.", {
    name: error.name,
    code: error.code,
  });

  return response.status(500).json({
    message: "Erro interno na aplicação.",
  });
}
