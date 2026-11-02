import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import nodemailer from "nodemailer";
import { sendPasswordResetEmail } from "../../src/infrastructure/email/mailer.js";

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(),
  },
}));

const message = {
  to: "destinatario@example.com",
  name: "Pessoa de teste",
  token: "codigo-exclusivo-do-teste",
};

describe("envio do e-mail de recuperação", () => {
  let sendMail;

  beforeEach(() => {
    vi.resetAllMocks();

    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_PORT", "587");
    vi.stubEnv("SMTP_SECURE", "false");
    vi.stubEnv("SMTP_USER", "remetente@example.com");
    vi.stubEnv("SMTP_PASSWORD", "senha-ficticia-de-teste");
    vi.stubEnv("EMAIL_FROM", "remetente@example.com");

    sendMail = vi.fn().mockResolvedValue({
      messageId: "mensagem-de-teste",
    });

    nodemailer.createTransport.mockReturnValue({ sendMail });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("configura o transporte e monta a mensagem de recuperação", async () => {
    await sendPasswordResetEmail(message);

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      auth: {
        user: "remetente@example.com",
        pass: "senha-ficticia-de-teste",
      },
    });

    expect(sendMail).toHaveBeenCalledOnce();
    expect(sendMail).toHaveBeenCalledWith({
      from: "remetente@example.com",
      to: message.to,
      subject: "Recuperação de senha - Biblioteca",
      text: expect.any(String),
    });

    const sentMessage = sendMail.mock.calls[0][0];

    expect(sentMessage.text).toContain(message.name);
    expect(sentMessage.text).toContain(message.token);
    expect(sentMessage.text).toContain("15 minutos");
    expect(sentMessage.text).toContain("apenas uma vez");
  });

  it("respeita a configuração de conexão segura", async () => {
    vi.stubEnv("SMTP_PORT", "465");
    vi.stubEnv("SMTP_SECURE", "true");

    await sendPasswordResetEmail(message);

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 465,
        secure: true,
      }),
    );
  });

  it("utiliza a porta padrão quando nenhuma porta foi informada", async () => {
    vi.stubEnv("SMTP_PORT", undefined);

    await sendPasswordResetEmail(message);

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 587,
      }),
    );
  });

  it.each([
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "EMAIL_FROM",
  ])("recusa envio sem a configuração %s", async (variable) => {
    vi.stubEnv(variable, undefined);

    await expect(
      sendPasswordResetEmail(message),
    ).rejects.toThrow(`Variável de e-mail ausente: ${variable}`);

    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("propaga a falha do provedor para a aplicação tratá-la", async () => {
    const error = new Error("Falha de comunicação com SMTP");
    sendMail.mockRejectedValue(error);

    await expect(
      sendPasswordResetEmail(message),
    ).rejects.toThrow("Falha de comunicação com SMTP");

    expect(sendMail).toHaveBeenCalledOnce();
  });
});