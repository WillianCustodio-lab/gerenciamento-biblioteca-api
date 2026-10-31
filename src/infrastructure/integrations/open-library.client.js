function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function findBookByIsbn(isbn) {
  const url = new URL("https://openlibrary.org/search.json");

  url.searchParams.set("q", `isbn:${isbn}`);
  url.searchParams.set("fields", "title,author_name");
  url.searchParams.set("limit", "1");

  let response;
  let data;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "GerenciamentoBibliotecaAPI/1.0 (https://github.com/WillianCustodio-lab/gerenciamento-biblioteca-api)",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok) {
      data = await response.json();
    }
  } catch {
    throw createError(
      "Não foi possível consultar a Open Library. Tente novamente.",
      503,
    );
  }

  if (!response.ok) {
    throw createError(
      "A Open Library está indisponível no momento. Tente novamente.",
      503,
    );
  }

  if (!Array.isArray(data?.docs)) {
    throw createError(
      "A Open Library retornou uma resposta inesperada.",
      502,
    );
  }

  const externalBook = data.docs[0];

  if (!externalBook) {
    throw createError(
      "ISBN não encontrado na Open Library. Utilize o cadastro manual.",
      404,
    );
  }

  const title =
    typeof externalBook.title === "string"
      ? externalBook.title.trim()
      : "";

  const authors = Array.isArray(externalBook.author_name)
    ? externalBook.author_name
        .filter((author) => typeof author === "string")
        .map((author) => author.trim())
        .filter(Boolean)
    : [];

  if (!title || authors.length === 0) {
    throw createError(
      "O livro possui informações incompletas. Utilize o cadastro manual.",
      422,
    );
  }

  return {
    title,
    author: authors.join(", "),
    isbn,
  };
}