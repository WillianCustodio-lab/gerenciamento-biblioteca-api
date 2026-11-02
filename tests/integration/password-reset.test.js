import request from "supertest";
import { createHash } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { app } from "../../src/app.js";
import { pool } from "../../src/infrastructure/database/connection.js";
import { sendPasswordResetEmail } from "../../src/infrastructure/email/mailer.js";
import {
  cleanDatabase,
  closeDatabase,
  prepareDatabase,
} from "../helpers/database.js";

vi.mock("../../src/infrastructure/email/mailer.js", () => ({
  sendPasswordResetEmail: vi.fn(),
}));

const email = "recuperacao@example.com";
const originalPassword = "SenhaOriginalTeste123";
const newPassword = "NovaSenhaTeste456";

async function requestResetToken() {
  const response = await request(app)
    .post("/auth/forgot-password")
    .send({ email })
    .expect(200);

  expect(response.body).not.toHaveProperty("token");
  expect(sendPasswordResetEmail).toHaveBeenCalledOnce();
  expect(sendPasswordResetEmail).toHaveBeenCalledWith({
    to: email,
    name: "Pessoa de teste",
    token: expect.any(String),
  });

  return sendPasswordResetEmail.mock.calls[0][0].token;
}

async function readRecoveryState() {
  const result = await pool.query(
    `SELECT password_reset_token_hash,
            password_reset_expires_at,
            password_reset_expires_at > NOW() AS is_valid
     FROM users
     WHERE email = $1`,
    [email],
  );

  return result.rows[0];
}

describe("recuperação de senha com PostgreSQL", () => {
  beforeAll(async () => {
    await prepareDatabase();
  });

  beforeEach(async () => {
    vi.resetAllMocks();
    sendPasswordResetEmail.mockResolvedValue(undefined);

    await cleanDatabase();

    await request(app)
      .post("/auth/register")
      .send({
        name: "Pessoa de teste",
        email,
        password: originalPassword,
      })
      .expect(201);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("protege o código, altera a senha e impede sua reutilização", async () => {
    const startedAt = Date.now();
    const token = await requestResetToken();
    const finishedAt = Date.now();

    expect(token).toMatch(/^[a-f0-9]{64}$/);

    const expectedHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const pending = await readRecoveryState();

    expect(pending.password_reset_token_hash).toBe(expectedHash);
    expect(pending.password_reset_token_hash).not.toBe(token);
    expect(pending.is_valid).toBe(true);
    const expiresAt = new Date(
      pending.password_reset_expires_at,
    ).getTime();

    const fifteenMinutes = 15 * 60 * 1000;

    expect(expiresAt).toBeGreaterThanOrEqual(
      startedAt + fifteenMinutes,
    );

    expect(expiresAt).toBeLessThanOrEqual(
      finishedAt + fifteenMinutes,
    );

    await request(app)
      .post("/auth/reset-password")
      .send({ token, password: newPassword })
      .expect(200);

    const completed = await readRecoveryState();

    expect(completed.password_reset_token_hash).toBeNull();
    expect(completed.password_reset_expires_at).toBeNull();

    await request(app)
      .post("/auth/login")
      .send({ email, password: newPassword })
      .expect(200);

    await request(app)
      .post("/auth/login")
      .send({ email, password: originalPassword })
      .expect(401);

    await request(app)
      .post("/auth/reset-password")
      .send({ token, password: "OutraSenhaTeste789" })
      .expect(400);
  });

  it("não revela se o e-mail solicitado está cadastrado", async () => {
    const unknown = await request(app)
      .post("/auth/forgot-password")
      .send({ email: "desconhecido@example.com" })
      .expect(200);

    expect(sendPasswordResetEmail).not.toHaveBeenCalled();

    const known = await request(app)
      .post("/auth/forgot-password")
      .send({ email })
      .expect(200);

    expect(known.body).toEqual(unknown.body);
    expect(known.body).toEqual({
      message: "Se o e-mail estiver cadastrado, as instruções serão enviadas.",
    });
    expect(sendPasswordResetEmail).toHaveBeenCalledOnce();
  });

  it("recusa código expirado e preserva a senha anterior", async () => {
    const token = await requestResetToken();

    await pool.query(
      `UPDATE users
       SET password_reset_expires_at = NOW() - INTERVAL '1 second'
       WHERE email = $1`,
      [email],
    );

    await request(app)
      .post("/auth/reset-password")
      .send({ token, password: newPassword })
      .expect(400);

    await request(app)
      .post("/auth/login")
      .send({ email, password: originalPassword })
      .expect(200);
  });

  it("recusa código incorreto sem consumir o código válido", async () => {
    await requestResetToken();
    const before = await readRecoveryState();

    await request(app)
      .post("/auth/reset-password")
      .send({
        token: "codigo-incorreto",
        password: newPassword,
      })
      .expect(400);

    const after = await readRecoveryState();

    expect(after.password_reset_token_hash).toBe(
      before.password_reset_token_hash,
    );

    await request(app)
      .post("/auth/login")
      .send({ email, password: originalPassword })
      .expect(200);
  });

  it("invalida o código quando o envio de e-mail falha", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    sendPasswordResetEmail.mockRejectedValue(
      new Error("Servidor de e-mail indisponível"),
    );

    const response = await request(app)
      .post("/auth/forgot-password")
      .send({ email })
      .expect(500);

    expect(response.body).toEqual({
      message: "Erro interno na aplicação.",
    });
    expect(sendPasswordResetEmail).toHaveBeenCalledOnce();

    const state = await readRecoveryState();

    expect(state.password_reset_token_hash).toBeNull();
    expect(state.password_reset_expires_at).toBeNull();
  });

  it.each([
    {},
    { email: "" },
    { email: 123 },
  ])("recusa solicitação de recuperação inválida: %j", async (data) => {
    await request(app)
      .post("/auth/forgot-password")
      .send(data)
      .expect(400);

    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { token: "codigo" },
    { token: 123, password: newPassword },
    { token: "codigo", password: 123 },
    { token: "codigo", password: "curta" },
  ])("recusa alteração de senha inválida: %j", async (data) => {
    await request(app)
      .post("/auth/reset-password")
      .send(data)
      .expect(400);

    await request(app)
      .post("/auth/login")
      .send({ email, password: originalPassword })
      .expect(200);
  });
});
