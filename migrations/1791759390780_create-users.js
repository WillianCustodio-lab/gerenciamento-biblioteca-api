export const up = (pgm) => {
  pgm.createTable("users", {
    id: {
      type: "bigserial",
      primaryKey: true,
    },

    name: {
      type: "varchar(120)",
      notNull: true,
    },

    email: {
      type: "varchar(255)",
      notNull: true,
      unique: true,
    },

    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
};

export const down = (pgm) => {
  pgm.dropTable("users");
};