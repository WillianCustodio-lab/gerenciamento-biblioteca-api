import { describe, expect, it } from "vitest";
import { isValidEmail } from "../../src/utils/email.js";

describe("validação de e-mail", () => {
  it.each([
    "pessoa@example.com",
    "pessoa+teste@sub.example.com",
    "pessoa@b.c",
    "pessoa@b..c",
    "pessoa@.b.c",
    "pessoa@..b",
    "pessoa@b.c.",
    "pessoa..teste@example.com",
    "usuário@exemplo.com",
  ])("preserva o formato aceito anteriormente: %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    "",
    "email-invalido",
    "@example.com",
    "pessoa@",
    "pessoa@example",
    "pessoa@.com",
    "pessoa@example.",
    "pessoa@.",
    "pessoa@@example.com",
    "pessoa@exemplo@dominio.com",
    "pes soa@example.com",
    "pessoa@exa mple.com",
    "pessoa\t@example.com",
    "pessoa@exa\nmple.com",
  ])("recusa um formato inválido: %s", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});
