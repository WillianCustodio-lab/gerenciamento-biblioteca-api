import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { pathToFileURL } from "node:url";
import { pool } from "../infrastructure/database/connection.js";
import { createAdministrator } from "../services/admin.service.js";

export async function runCreateAdmin({
  input = stdin,
  output = stdout,
  createAdmin = createAdministrator,
} = {}) {
  if (!input.isTTY || !output.isTTY) {
    const error = new Error(
      "Execute em um terminal interativo: docker compose exec app node src/scripts/create-admin.js (sem -T).",
    );
    error.statusCode = 400;
    throw error;
  }

  let hideInput = false;
  const terminalOutput = new Writable({
    write(chunk, encoding, callback) {
      if (!hideInput) output.write(chunk, encoding);
      callback();
    },
  });
  const terminal = createInterface({ input, output: terminalOutput, terminal: true });
  const cancellation = new AbortController();
  terminal.on("SIGINT", () => cancellation.abort());
  terminal.on("close", () => cancellation.abort());

  async function ask(label, secret = false) {
    if (!secret) {
      return terminal.question(label, { signal: cancellation.signal });
    }

    output.write(label);
    hideInput = true;
    try {
      return await terminal.question("", { signal: cancellation.signal });
    } finally {
      hideInput = false;
      output.write("\n");
    }
  }

  try {
    output.write("Criação de administrador\nA senha não será exibida enquanto você digita.\n\n");
    const name = await ask("Nome: ");
    const email = await ask("E-mail: ");
    const password = await ask("Senha: ", true);
    const confirmation = await ask("Confirme a senha: ", true);

    if (password !== confirmation) {
      const error = new Error("As senhas não coincidem. Nenhuma conta foi criada.");
      error.statusCode = 400;
      throw error;
    }

    const administrator = await createAdmin({ name, email, password });
    output.write("Administrador criado com sucesso. Utilize essas credenciais no login.\n");
    return administrator;
  } finally {
    terminal.close();
    terminalOutput.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.env.DATABASE_URL) {
      const error = new Error("Configure DATABASE_URL ou execute o comando dentro do serviço app do Docker.");
      error.statusCode = 400;
      throw error;
    }
    await runCreateAdmin();
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("\nOperação cancelada.");
      process.exitCode = 130;
    } else {
      console.error(error.statusCode ? error.message :
        "Não foi possível criar o administrador. Confira a conexão com o banco e a execução das migrations.");
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}
