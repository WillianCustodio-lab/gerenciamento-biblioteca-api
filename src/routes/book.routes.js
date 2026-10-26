import { Router } from "express";
import {
  editBook,
  listBooks,
  registerBook,
  removeBook,
  showBook,
} from "../controllers/book.controller.js";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { authorize } from "../middlewares/authorization.middleware.js";

const bookRoutes = Router();

bookRoutes.use(authenticate);
bookRoutes.get("/", listBooks);
bookRoutes.get("/:id", showBook);
bookRoutes.post("/", authorize("admin"), registerBook);
bookRoutes.put("/:id", authorize("admin"), editBook);
bookRoutes.delete("/:id", authorize("admin"), removeBook);

export { bookRoutes };
