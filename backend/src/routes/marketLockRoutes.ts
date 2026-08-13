import { Router } from "express";
import {
  lockMarket,
  unlockMarket,
  isMarketLocked,
  getMarketLocks,
} from "../controllers/marketLockController";
import { authMiddleware, adminOnly } from "../middlewares/auth";

const router = Router();

router.post("/lock", authMiddleware, adminOnly, lockMarket);
router.post("/unlock", authMiddleware, adminOnly, unlockMarket);
router.get("/status", authMiddleware, isMarketLocked);
router.get("/locks", authMiddleware, adminOnly, getMarketLocks);

export default router;
