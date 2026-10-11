export const up = (pgm) => {
  pgm.createTable("loans", {
    id: {
      type: "bigserial",
      primaryKey: true,
    },

    user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
    },

    book_id: {
      type: "bigint",
      notNull: true,
      references: "books(id)",
      onDelete: "RESTRICT",
    },

    loan_date: {
      type: "date",
      notNull: true,
      default: pgm.func("current_date"),
    },

    due_date: {
      type: "date",
      notNull: true,
    },

    returned_at: {
      type: "date",
    },

    status: {
      type: "varchar(20)",
      notNull: true,
      default: "active",
    },
  });

  pgm.addConstraint("loans", "loans_status_check", {
    check: "status IN ('active', 'returned')",
  });

  pgm.addConstraint("loans", "loans_due_date_check", {
    check: "due_date > loan_date",
  });

  pgm.addConstraint("loans", "loans_returned_at_check", {
    check: "returned_at IS NULL OR returned_at >= loan_date",
  });

  pgm.createIndex("loans", "book_id", {
    name: "loans_one_active_per_book_idx",
    unique: true,
    where: "status = 'active'",
  });
};

export const down = (pgm) => {
  pgm.dropTable("loans");
};