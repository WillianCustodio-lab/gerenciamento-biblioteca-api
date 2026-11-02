import { afterEach, describe, expect, it, vi } from "vitest";
import {
  errorHandler,
  notFound,
} from "../../src/middlewares/error-handler.middleware.js";
import { createResponse } from "../helpers/http.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tratamento de erros", () => {
  it("responde 404 para rota inexistente", () => {
    const response = createResponse();

    notFound({}, response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      message: "Rota não encontrada.",
    });
  });

  it.each([
    [
      { type: "entity.parse.failed" },
      400,
      "O corpo da requisição contém um JSON inválido.",
    ],
    [
      { type: "entity.too.large" },
      413,
      "O corpo da requisição excede o tamanho permitido.",
    ],
    [
      { code: "23505" },
      409,
      "Já existe um registro com esses dados únicos.",
    ],
    [
      { code: "23503" },
      409,
      "A operação conflita com registros relacionados.",
    ],
  ])("converte o erro %j em resposta HTTP %i", (error, status, message) => {
    const response = createResponse();
    const next = vi.fn();

    errorHandler(error, {}, response, next);

    expect(response.status).toHaveBeenCalledWith(status);
    expect(response.json).toHaveBeenCalledWith({ message });
    expect(next).not.toHaveBeenCalled();
  });

  it("preserva a mensagem de um erro previsto pela aplicação", () => {
    const error = new Error("Livro indisponível.");
    error.statusCode = 409;

    const response = createResponse();

    errorHandler(error, {}, response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({
      message: "Livro indisponível.",
    });
  });

  it("oculta detalhes de um erro inesperado", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Detalhe interno que não deve chegar ao cliente");
    const response = createResponse();

    errorHandler(error, {}, response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      message: "Erro interno na aplicação.",
    });
    expect(log).toHaveBeenCalledOnce();
  });

  it("encaminha o erro quando a resposta já começou a ser enviada", () => {
    const error = new Error("Falha após o início da resposta");
    const response = createResponse();
    response.headersSent = true;

    const next = vi.fn();

    errorHandler(error, {}, response, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(response.status).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
  });
});