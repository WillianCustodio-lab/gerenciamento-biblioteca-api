import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  login,
  register,
} from "../controllers/auth.controller.js";

const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.post("/forgot-password", forgotPassword);
authRoutes.post("/reset-password", changePassword);

export { authRoutes };
