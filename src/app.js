import express from "express";
import { pool } from "./infrastructure/database/connection.js";

const app = express();

app.use(express.json());

app.get("/health", async (request, response) => {
  try {
    const result = await pool.query("SELECT NOW() AS database_time");

    return response.status(200).json({
      status: "ok",
      database: "connected",
      databaseTime: result.rows[0].database_time,
    });
  } catch (error) {
    return response.status(503).json({
      status: "error",
      database: "disconnected",
    });
  }
});

export { app };
