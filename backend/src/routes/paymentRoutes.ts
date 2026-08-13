import { Router } from "express";
import {
  createPayment,
  getPayments,
  getPaymentStats,
  updatePayment,
  verifyPayment,
  deletePayment,
} from "../controllers/paymentController";
import { authMiddleware, adminOnly } from "../middlewares/auth";

const router = Router();

router.post("/", authMiddleware, adminOnly, createPayment);
router.get("/", authMiddleware, getPayments);
router.get("/stats", authMiddleware, getPaymentStats);
router.patch("/:id", authMiddleware, adminOnly, updatePayment);
router.patch("/:id/verify", authMiddleware, adminOnly, verifyPayment);
router.delete("/:id", authMiddleware, adminOnly, deletePayment);

export default router;
