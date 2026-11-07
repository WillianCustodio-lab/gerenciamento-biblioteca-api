import request from "supertest";
import bcrypt from "bcryptjs";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { app } from "../../src/app.js";
import { pool } from "../../src/infrastructure/database/connection.js";
import { createAdministrator } from "../../src/services/admin.service.js";
import {
  cleanDatabase,
  closeDatabase,
  prepareDatabase,
} from "../helpers/database.js";

const password = "SenhaSomenteParaTeste123";

const bookData = {
  title: "Matilda",
  author: "Roald Dahl",
  isbn: "9780140328721",
};

async function createSession(role = "user", email = "user@example.com") {
  const data = {
    name: "Pessoa de teste",
    email,
    password,
  };

  if (role === "admin") {
    await createAdministrator(data);
  } else {
    await request(app)
      .post("/auth/register")
      .send(data)
      .expect(201);
  }

  const login = await request(app)
    .post("/auth/login")
    .send({ email, password })
    .expect(200);

  expect(login.body.token).toEqual(expect.any(String));

  return {
    user: login.body.user,
    authorization: `Bearer ${login.body.token}`,
  };
}

async function createBook(authorization) {
  const response = await request(app)
    .post("/books")
    .set("Authorization", authorization)
    .send(bookData)
    .expect(201);

  return response.body.book;
}

async function getDueDate(days = 7) {
  const result = await pool.query(
    "SELECT (CURRENT_DATE + $1::integer)::text AS due_date",
    [days],
  );

  return result.rows[0].due_date;
}

async function createLoanScenario() {
  const admin = await createSession("admin", "admin@example.com");
  const firstUser = await createSession("user", "primeiro@example.com");
  const secondUser = await createSession("user", "segundo@example.com");

  const firstBook = await createBook(admin.authorization);
  const secondBook = await createBook(admin.authorization);
  const dueDate = await getDueDate();

  const firstResponse = await request(app)
    .post("/loans")
    .set("Authorization", admin.authorization)
    .send({
      user_id: firstUser.user.id,
      book_id: firstBook.id,
      due_date: dueDate,
    })
    .expect(201);

  const secondResponse = await request(app)
    .post("/loans")
    .set("Authorization", admin.authorization)
    .send({
      user_id: secondUser.user.id,
      book_id: secondBook.id,
      due_date: dueDate,
    })
    .expect(201);

  const secondLoan = secondResponse.body.loan;

  await request(app)
    .patch(`/loans/${secondLoan.id}/return`)
    .set("Authorization", admin.authorization)
    .expect(200);

  return {
    admin,
    firstUser,
    secondUser,
    firstLoan: firstResponse.body.loan,
    secondLoan,
  };
}

describe("integração da biblioteca com PostgreSQL", () => {
  beforeAll(async () => {
    await prepareDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("confirma a conexão real pelo endpoint de saúde", async () => {
    const response = await request(app)
      .get("/health")
      .expect(200);

    expect(response.body).toMatchObject({
      status: "ok",
      database: "connected",
    });
    expect(response.body.databaseTime).toEqual(expect.any(String));
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("cadastra, protege a senha e permite login e consulta do próprio cadastro", async () => {
    const session = await createSession();

    expect(session.user.role).toBe("user");

    const stored = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [session.user.id],
    );

    const hash = stored.rows[0].password_hash;

    expect(hash).not.toBe(password);
    expect(await bcrypt.compare(password, hash)).toBe(true);

    const response = await request(app)
      .get("/users/me")
      .set("Authorization", session.authorization)
      .expect(200);

    expect(response.body.user.email).toBe("user@example.com");
    expect(response.body.user).not.toHaveProperty("password_hash");
  });

  it("recusa login com senha incorreta", async () => {
    await createSession();

    await request(app)
      .post("/auth/login")
      .send({
        email: "user@example.com",
        password: "SenhaIncorreta123",
      })
      .expect(401);
  });

  it("impede usuário comum de cadastrar livro", async () => {
    const session = await createSession();

    await request(app)
      .post("/books")
      .set("Authorization", session.authorization)
      .send(bookData)
      .expect(403);

    const result = await pool.query(
      "SELECT COUNT(*)::integer AS total FROM books",
    );

    expect(result.rows[0].total).toBe(0);
  });

  it("permite ao administrador cadastrar, consultar, atualizar e excluir livro", async () => {
    const admin = await createSession("admin", "admin@example.com");
    const book = await createBook(admin.authorization);

    const listed = await request(app)
      .get("/books")
      .set("Authorization", admin.authorization)
      .expect(200);

    expect(listed.body.books).toHaveLength(1);
    expect(listed.body.books[0].id).toBe(book.id);

    const changed = await request(app)
      .put(`/books/${book.id}`)
      .set("Authorization", admin.authorization)
      .send({ ...bookData, title: "Matilda — exemplar atualizado" })
      .expect(200);

    expect(changed.body.book.title).toBe("Matilda — exemplar atualizado");

    const found = await request(app)
      .get(`/books/${book.id}`)
      .set("Authorization", admin.authorization)
      .expect(200);

    expect(found.body.book.title).toBe(changed.body.book.title);

    await request(app)
      .delete(`/books/${book.id}`)
      .set("Authorization", admin.authorization)
      .expect(200);

    await request(app)
      .get(`/books/${book.id}`)
      .set("Authorization", admin.authorization)
      .expect(404);
  });

  it("registra empréstimo, impede duplicação e libera o livro na devolução", async () => {
    const admin = await createSession("admin", "admin@example.com");
    const borrower = await createSession();
    const book = await createBook(admin.authorization);

    const loanData = {
      user_id: borrower.user.id,
      book_id: book.id,
      due_date: await getDueDate(),
    };

    const created = await request(app)
      .post("/loans")
      .set("Authorization", admin.authorization)
      .send(loanData)
      .expect(201);

    expect(created.body.loan.status).toBe("active");

    const borrowedBook = await request(app)
      .get(`/books/${book.id}`)
      .set("Authorization", borrower.authorization)
      .expect(200);

    expect(borrowedBook.body.book.status).toBe("loaned");

    await request(app)
      .post("/loans")
      .set("Authorization", admin.authorization)
      .send(loanData)
      .expect(409);

    const stored = await pool.query(
      "SELECT COUNT(*)::integer AS total FROM loans",
    );

    expect(stored.rows[0].total).toBe(1);

    const returned = await request(app)
      .patch(`/loans/${created.body.loan.id}/return`)
      .set("Authorization", admin.authorization)
      .expect(200);

    expect(returned.body.loan.status).toBe("returned");
    expect(returned.body.loan.returned_at).not.toBeNull();

    const availableBook = await request(app)
      .get(`/books/${book.id}`)
      .set("Authorization", borrower.authorization)
      .expect(200);

    expect(availableBook.body.book.status).toBe("available");

    await request(app)
      .patch(`/loans/${created.body.loan.id}/return`)
      .set("Authorization", admin.authorization)
      .expect(409);
  });

  it("preserva o livro e não grava empréstimo quando a data é inválida", async () => {
    const admin = await createSession("admin", "admin@example.com");
    const borrower = await createSession();
    const book = await createBook(admin.authorization);

    await request(app)
      .post("/loans")
      .set("Authorization", admin.authorization)
      .send({
        user_id: borrower.user.id,
        book_id: book.id,
        due_date: await getDueDate(0),
      })
      .expect(400);

    const loans = await pool.query(
      "SELECT COUNT(*)::integer AS total FROM loans",
    );

    const storedBook = await pool.query(
      "SELECT status FROM books WHERE id = $1",
      [book.id],
    );

    expect(loans.rows[0].total).toBe(0);
    expect(storedBook.rows[0].status).toBe("available");
  });

  it("responde 404 para uma rota inexistente", async () => {
    const response = await request(app)
      .get("/rota-inexistente")
      .expect(404);

    expect(response.body.message).toBe("Rota não encontrada.");
  });

  describe("usuários", () => {
  it("atualiza o próprio cadastro sem permitir mudança de perfil", async () => {
    const session = await createSession();

    const response = await request(app)
      .put("/users/me")
      .set("Authorization", session.authorization)
      .send({
        name: "Nome atualizado",
        email: "atualizado@example.com",
        role: "admin",
      })
      .expect(200);

    expect(response.body.user).toMatchObject({
      id: session.user.id,
      name: "Nome atualizado",
      email: "atualizado@example.com",
      role: "user",
    });

    const stored = await pool.query(
      "SELECT name, email, role FROM users WHERE id = $1",
      [session.user.id],
    );

    expect(stored.rows[0]).toEqual({
      name: "Nome atualizado",
      email: "atualizado@example.com",
      role: "user",
    });
  });

  it.each([
    { name: "", email: "valido@example.com" },
    { name: "Nome válido", email: "email-invalido" },
    { name: "A".repeat(121), email: "valido@example.com" },
  ])("recusa cadastro pessoal inválido: %j", async (data) => {
    const session = await createSession();

    await request(app)
      .put("/users/me")
      .set("Authorization", session.authorization)
      .send(data)
      .expect(400);

    const current = await request(app)
      .get("/users/me")
      .set("Authorization", session.authorization)
      .expect(200);

    expect(current.body.user.name).toBe("Pessoa de teste");
    expect(current.body.user.email).toBe("user@example.com");
  });

  it("recusa e-mail de outra conta e preserva o cadastro anterior", async () => {
    const session = await createSession();
    await createSession("user", "outra@example.com");

    await request(app)
      .put("/users/me")
      .set("Authorization", session.authorization)
      .send({
        name: "Nome alterado",
        email: "outra@example.com",
      })
      .expect(409);

    const current = await request(app)
      .get("/users/me")
      .set("Authorization", session.authorization)
      .expect(200);

    expect(current.body.user.name).toBe("Pessoa de teste");
    expect(current.body.user.email).toBe("user@example.com");
  });

  it("permite somente ao administrador listar usuários sem expor senhas", async () => {
    const admin = await createSession("admin", "admin@example.com");
    const user = await createSession();

    await request(app)
      .get("/users")
      .set("Authorization", user.authorization)
      .expect(403);

    const response = await request(app)
      .get("/users")
      .set("Authorization", admin.authorization)
      .expect(200);

    expect(response.body.users.map((item) => item.id).sort()).toEqual(
      [admin.user.id, user.user.id].sort(),
    );

    for (const item of response.body.users) {
      expect(item).not.toHaveProperty("password_hash");
      expect(item).not.toHaveProperty("password_reset_token_hash");
    }
  });

  it("exclui conta sem histórico e recusa seu token após a exclusão", async () => {
    const admin = await createSession("admin", "admin@example.com");
    const user = await createSession();

    await request(app)
      .delete(`/users/${user.user.id}`)
      .set("Authorization", user.authorization)
      .expect(403);

    await request(app)
      .delete(`/users/${user.user.id}`)
      .set("Authorization", admin.authorization)
      .expect(200);

    const stored = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [user.user.id],
    );

    expect(stored.rows).toHaveLength(0);

    await request(app)
      .get("/users/me")
      .set("Authorization", user.authorization)
      .expect(401);
  });

  it("recusa autoexclusão, identificador inválido e conta inexistente", async () => {
    const admin = await createSession("admin", "admin@example.com");

    await request(app)
      .delete(`/users/${admin.user.id}`)
      .set("Authorization", admin.authorization)
      .expect(409);

    await request(app)
      .delete("/users/abc")
      .set("Authorization", admin.authorization)
      .expect(400);

    await request(app)
      .delete("/users/999999")
      .set("Authorization", admin.authorization)
      .expect(404);

    await request(app)
      .get("/users/me")
      .set("Authorization", admin.authorization)
      .expect(200);
  });

  it("preserva usuários com histórico de empréstimo ativo ou devolvido", async () => {
    const scenario = await createLoanScenario();

    for (const user of [scenario.firstUser, scenario.secondUser]) {
      await request(app)
        .delete(`/users/${user.user.id}`)
        .set("Authorization", scenario.admin.authorization)
        .expect(409);

      await request(app)
        .get("/users/me")
        .set("Authorization", user.authorization)
        .expect(200);
    }
  });
});

describe("consultas de empréstimos", () => {
  it("mostra todos ao administrador e somente os próprios a cada usuário", async () => {
    const scenario = await createLoanScenario();

    const adminResponse = await request(app)
      .get("/loans")
      .set("Authorization", scenario.admin.authorization)
      .expect(200);

    expect(adminResponse.body.loans.map((loan) => loan.id).sort()).toEqual(
      [scenario.firstLoan.id, scenario.secondLoan.id].sort(),
    );

    const firstResponse = await request(app)
      .get("/loans")
      .set("Authorization", scenario.firstUser.authorization)
      .expect(200);

    expect(firstResponse.body.loans.map((loan) => loan.id)).toEqual([
      scenario.firstLoan.id,
    ]);

    const secondResponse = await request(app)
      .get("/loans")
      .set("Authorization", scenario.secondUser.authorization)
      .expect(200);

    expect(secondResponse.body.loans.map((loan) => loan.id)).toEqual([
      scenario.secondLoan.id,
    ]);
  });

  it("permite consultar um empréstimo apenas ao proprietário ou administrador", async () => {
    const scenario = await createLoanScenario();
    const path = `/loans/${scenario.firstLoan.id}`;

    for (const session of [scenario.admin, scenario.firstUser]) {
      const response = await request(app)
        .get(path)
        .set("Authorization", session.authorization)
        .expect(200);

      expect(response.body.loan.id).toBe(scenario.firstLoan.id);
      expect(response.body.loan.user_id).toBe(scenario.firstUser.user.id);
    }

    await request(app)
      .get(path)
      .set("Authorization", scenario.secondUser.authorization)
      .expect(404);
  });

  it("filtra por situação sem revelar registros de outra pessoa", async () => {
    const scenario = await createLoanScenario();

    const active = await request(app)
      .get("/loans?status=active")
      .set("Authorization", scenario.admin.authorization)
      .expect(200);

    expect(active.body.loans.map((loan) => loan.id)).toEqual([
      scenario.firstLoan.id,
    ]);

    const returned = await request(app)
      .get("/loans?status=returned")
      .set("Authorization", scenario.admin.authorization)
      .expect(200);

    expect(returned.body.loans.map((loan) => loan.id)).toEqual([
      scenario.secondLoan.id,
    ]);

    const ownActive = await request(app)
      .get("/loans?status=active")
      .set("Authorization", scenario.firstUser.authorization)
      .expect(200);

    expect(ownActive.body.loans.map((loan) => loan.id)).toEqual([
      scenario.firstLoan.id,
    ]);

    const hiddenReturned = await request(app)
      .get("/loans?status=returned")
      .set("Authorization", scenario.firstUser.authorization)
      .expect(200);

    expect(hiddenReturned.body.loans).toEqual([]);

    const hiddenActive = await request(app)
      .get("/loans?status=active")
      .set("Authorization", scenario.secondUser.authorization)
      .expect(200);

    expect(hiddenActive.body.loans).toEqual([]);
  });

  it("recusa filtros e identificadores inválidos e empréstimo inexistente", async () => {
    const admin = await createSession("admin", "admin@example.com");

    await request(app)
      .get("/loans?status=invalido")
      .set("Authorization", admin.authorization)
      .expect(400);

    await request(app)
      .get("/loans/abc")
      .set("Authorization", admin.authorization)
      .expect(400);

    await request(app)
      .get("/loans/999999")
      .set("Authorization", admin.authorization)
      .expect(404);
  });
});

});