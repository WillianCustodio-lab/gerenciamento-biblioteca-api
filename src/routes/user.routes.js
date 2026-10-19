import { Router } from "express";
import {
  listUsers,
  showCurrentUser,
} from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { authorize } from "../middlewares/authorization.middleware.js";

const userRoutes = Router();

userRoutes.use(authenticate);
userRoutes.get("/me", showCurrentUser);
userRoutes.get("/", authorize("admin"), listUsers);

export { userRoutes };
