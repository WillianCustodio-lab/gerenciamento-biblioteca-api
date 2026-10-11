export const up = (pgm) => {
  pgm.createTable("books", {
    id: {
      type: "bigserial",
      primaryKey: true,
    },

    title: {
      type: "varchar(255)",
      notNull: true,
    },

    author: {
      type: "varchar(160)",
      notNull: true,
    },

    isbn: {
      type: "varchar(20)",
      notNull: true,
    },

    status: {
      type: "varchar(20)",
      notNull: true,
      default: "available",
    },

    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  pgm.addConstraint("books", "books_status_check", {
    check: "status IN ('available', 'loaned')",
  });
};

export const down = (pgm) => {
  pgm.dropTable("books");
};