const BASE_URL = "https://openlibrary.org";

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function requestJson(path) {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "GerenciamentoBibliotecaAPI/1.0 (https://github.com/WillianCustodio-lab/gerenciamento-biblioteca-api)",
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw createError(
      "Não foi possível consultar a Open Library. Tente novamente.",
      503,
    );
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw createError(
      "A Open Library está indisponível. Tente novamente.",
      503,
    );
  }

  try {
    return await response.json();
  } catch {
    throw createError(
      "A Open Library retornou uma resposta inválida.",
      502,
    );
  }
}

export async function findBookByIsbn(isbn) {
  const edition = await requestJson(
    `/isbn/${encodeURIComponent(isbn)}.json`,
  );

  if (!edition) {
    throw createError(
      "ISBN não encontrado. Utilize o cadastro manual.",
      404,
    );
  }

  const title =
    typeof edition.title === "string" ? edition.title.trim() : "";

  if (!title || !Array.isArray(edition.authors) || !edition.authors.length) {
    throw createError(
      "O livro possui informações incompletas. Utilize o cadastro manual.",
      422,
    );
  }

  const authors = [];

  for (const reference of edition.authors) {
    const key = reference?.key;

    if (typeof key !== "string" || !/^\/authors\/OL\d+A$/.test(key)) {
      throw createError("Referência de autor inválida na Open Library.", 502);
    }

    const author = await requestJson(`${key}.json`);

    if (typeof author?.name !== "string" || !author.name.trim()) {
      throw createError(
        "Autor não encontrado. Utilize o cadastro manual.",
        422,
      );
    }

    authors.push(author.name.trim());
  }

  return {
    title,
    author: authors.join(", "),
    isbn,
  };
}