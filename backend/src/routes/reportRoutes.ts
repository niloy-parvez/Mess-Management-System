import { Router } from "express";
import {
  generateMealRate,
  getMealRate,
  generateMonthlyBills,
  closeMonth,
  getMonthlyBill,
  getMemberMonthlyBills,
  getReportsSummary,
} from "../controllers/reportController";
import { authMiddleware, adminOnly } from "../middlewares/auth";

const router = Router();

router.get("/summary", authMiddleware, getReportsSummary);
router.post("/meal-rate/generate", authMiddleware, adminOnly, generateMealRate);
router.get("/meal-rate", authMiddleware, getMealRate);
router.post("/monthly-bills/generate", authMiddleware, adminOnly, generateMonthlyBills);
router.post("/close-month", authMiddleware, adminOnly, closeMonth);
router.get("/monthly-bill", authMiddleware, getMonthlyBill);
router.get("/member/:memberId/bills", authMiddleware, getMemberMonthlyBills);

export default router;
