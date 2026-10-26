import { Router } from "express";
import {
  listLoans,
  registerLoan,
  returnRegisteredLoan,
  showLoan,
} from "../controllers/loan.controller.js";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { authorize } from "../middlewares/authorization.middleware.js";

const loanRoutes = Router();

loanRoutes.use(authenticate);
loanRoutes.get("/", listLoans);
loanRoutes.get("/:id", showLoan);
loanRoutes.post("/", authorize("admin"), registerLoan);
loanRoutes.patch("/:id/return", authorize("admin"), returnRegisteredLoan);

export { loanRoutes };
