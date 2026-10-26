import { Router } from "express";
import { registerLoan } from "../controllers/loan.controller.js";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { authorize } from "../middlewares/authorization.middleware.js";

const loanRoutes = Router();

loanRoutes.use(authenticate);
loanRoutes.post("/", authorize("admin"), registerLoan);

export { loanRoutes };
