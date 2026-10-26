import { Router } from "express";
import {
  listBooks,
  registerBook,
} from "../controllers/book.controller.js";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { authorize } from "../middlewares/authorization.middleware.js";

const bookRoutes = Router();

bookRoutes.use(authenticate);
bookRoutes.get("/", listBooks);
bookRoutes.post("/", authorize("admin"), registerBook);

export { bookRoutes };
