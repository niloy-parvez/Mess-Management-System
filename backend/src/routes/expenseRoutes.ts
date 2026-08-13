import { Router } from "express";
import {
  createExpense,
  getExpenses,
  getExpenseStats,
  updateExpense,
  deleteExpense,
} from "../controllers/expenseController";
import { authMiddleware, adminOnly } from "../middlewares/auth";

const router = Router();

router.post("/", authMiddleware, adminOnly, createExpense);
router.get("/", authMiddleware, getExpenses);
router.get("/stats", authMiddleware, getExpenseStats);
router.patch("/:id", authMiddleware, adminOnly, updateExpense);
router.delete("/:id", authMiddleware, adminOnly, deleteExpense);

export default router;
