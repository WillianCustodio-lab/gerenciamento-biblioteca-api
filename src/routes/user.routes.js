import { Router } from "express";
import {
  editCurrentUser,
  listUsers,
  removeUser,
  showCurrentUser,
} from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { authorize } from "../middlewares/authorization.middleware.js";

const userRoutes = Router();

userRoutes.use(authenticate);
userRoutes.get("/me", showCurrentUser);
userRoutes.put("/me", editCurrentUser);
userRoutes.get("/", authorize("admin"), listUsers);
userRoutes.delete("/:id", authorize("admin"), removeUser);

export { userRoutes };
