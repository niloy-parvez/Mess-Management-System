import { Router } from "express";
import {
  createMarket,
  getMarketItems,
  getMarketStats,
  approveMarketItem,
  rejectMarketItem,
  deleteMarketItem,
  updateMarketItem,
} from "../controllers/marketController";
import { authMiddleware, adminOnly, memberOnly } from "../middlewares/auth";

const router = Router();

router.post("/", authMiddleware, memberOnly, createMarket);
router.get("/", authMiddleware, getMarketItems);
router.get("/stats", authMiddleware, getMarketStats);
router.patch("/:id", authMiddleware, memberOnly, updateMarketItem);
router.patch("/:id/approve", authMiddleware, adminOnly, approveMarketItem);
router.patch("/:id/reject", authMiddleware, adminOnly, rejectMarketItem);
router.delete("/:id", authMiddleware, adminOnly, deleteMarketItem);

export default router;
