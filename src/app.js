import express from "express";
import { pool } from "./infrastructure/database/connection.js";
import { authRoutes } from "./routes/auth.routes.js";
import { userRoutes } from "./routes/user.routes.js";
import { bookRoutes } from "./routes/book.routes.js";

const app = express();

app.use(express.json());
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/books", bookRoutes);

app.get("/health", async (request, response) => {
  try {
    const result = await pool.query("SELECT NOW() AS database_time");

    return response.status(200).json({
      status: "ok",
      database: "connected",
      databaseTime: result.rows[0].database_time,
    });
  } catch {
    return response.status(503).json({
      status: "error",
      database: "disconnected",
    });
  }
});

export { app };
