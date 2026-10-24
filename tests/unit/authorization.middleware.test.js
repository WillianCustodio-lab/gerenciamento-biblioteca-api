import { describe, expect, it, vi } from "vitest";
import { authorize } from "../../src/middlewares/authorization.middleware.js";

function createResponse() {
  const response = {};

  response.status = vi.fn().mockReturnValue(response);
  response.json = vi.fn().mockReturnValue(response);

  return response;
}

describe("authorization middleware", () => {
  it("permite acesso quando o usuário possui o perfil necessário", () => {
    const request = {
      user: {
        role: "admin",
      },
    };

    const response = createResponse();
    const next = vi.fn();
    const middleware = authorize("admin");

    middleware(request, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(response.status).not.toHaveBeenCalled();
  });

  it("retorna 403 quando o usuário não possui o perfil necessário", () => {
    const request = {
      user: {
        role: "user",
      },
    };

    const response = createResponse();
    const next = vi.fn();
    const middleware = authorize("admin");

    middleware(request, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      message: "Você não possui permissão para esta operação.",
    });
    expect(next).not.toHaveBeenCalled();
  });
});