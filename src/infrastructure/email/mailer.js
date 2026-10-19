import nodemailer from "nodemailer";

function createTransporter() {
  const requiredVariables = [
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "EMAIL_FROM",
  ];

  const missingVariable = requiredVariables.find(
    (variable) => !process.env[variable],
  );

  if (missingVariable) {
    throw new Error(`Variável de e-mail ausente: ${missingVariable}`);
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

export async function sendPasswordResetEmail({ to, name, token }) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Recuperação de senha - Biblioteca",
    text: [
      `Olá, ${name}.`,
      "",
      "Use o código abaixo para redefinir sua senha:",
      token,
      "",
      "O código expira em 15 minutos e pode ser utilizado apenas uma vez.",
      "Se você não solicitou a recuperação, ignore este e-mail.",
    ].join("\n"),
  });
}
