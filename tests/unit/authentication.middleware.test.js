import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import jwt from "jsonwebtoken";
import { authenticate } from "../../src/middlewares/authentication.middleware.js";
import { findUserById } from "../../src/services/user.service.js";
import { createResponse } from "../helpers/http.js";

vi.mock("../../src/services/user.service.js", () => ({
  findUserById: vi.fn(),
}));

function createToken(subject = "1", options = {}) {
  return jwt.sign(
    { sub: subject, role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "1h", ...options },
  );
}

describe("autenticação", () => {
  let response;
  let next;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("JWT_SECRET", "chave-exclusiva-dos-testes");

    response = createResponse();
    next = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    undefined,
    "Basic abc",
    "Bearer",
    "Bearer ",
  ])("recusa cabeçalho de autenticação inválido: %s", async (authorization) => {
    const request = {
      headers: { authorization },
    };

    await authenticate(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(findUserById).not.toHaveBeenCalled();
  });

  it.each(["inválido", "expirado"])(
    "recusa token %s",
    async (scenario) => {
      const token = scenario === "expirado"
        ? createToken("1", { expiresIn: -1 })
        : "token-invalido";

      const request = {
        headers: { authorization: `Bearer ${token}` },
      };

      await authenticate(request, response, next);

      expect(response.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
      expect(findUserById).not.toHaveBeenCalled();
    },
  );

  it.each(["abc", "0", "-1"])(
    "recusa identificador de usuário inválido: %s",
    async (subject) => {
      const request = {
        headers: {
          authorization: `Bearer ${createToken(subject)}`,
        },
      };

      await authenticate(request, response, next);

      expect(response.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
      expect(findUserById).not.toHaveBeenCalled();
    },
  );

  it("recusa token de uma conta que não existe mais", async () => {
    findUserById.mockResolvedValue(undefined);

    const request = {
      headers: { authorization: `Bearer ${createToken()}` },
    };

    await authenticate(request, response, next);

    expect(findUserById).toHaveBeenCalledWith(1);
    expect(response.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("usa o perfil atual do banco para liberar o acesso", async () => {
    findUserById.mockResolvedValue({
      id: "1",
      role: "user",
    });

    const request = {
      headers: { authorization: `Bearer ${createToken()}` },
    };

    await authenticate(request, response, next);

    expect(request.user).toEqual({
      id: 1,
      role: "user",
    });
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
    expect(response.status).not.toHaveBeenCalled();
  });

  it("encaminha falhas da consulta ao tratamento de erros", async () => {
    const error = new Error("Falha na consulta");
    findUserById.mockRejectedValue(error);

    const request = {
      headers: { authorization: `Bearer ${createToken()}` },
    };

    await authenticate(request, response, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(response.status).not.toHaveBeenCalled();
  });
});