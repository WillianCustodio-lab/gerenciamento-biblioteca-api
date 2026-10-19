export const up = (pgm) => {
  pgm.addColumns("users", {
    password_hash: {
      type: "text",
      notNull: true,
    },

    role: {
      type: "varchar(20)",
      notNull: true,
      default: "user",
    },

    password_reset_token_hash: {
      type: "text",
    },

    password_reset_expires_at: {
      type: "timestamptz",
    },
  });

  pgm.addConstraint("users", "users_role_check", {
    check: "role IN ('user', 'admin')",
  });
};

export const down = (pgm) => {
  pgm.dropConstraint("users", "users_role_check");

  pgm.dropColumns("users", [
    "password_hash",
    "role",
    "password_reset_token_hash",
    "password_reset_expires_at",
  ]);
};
