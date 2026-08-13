import { Router } from "express";
import {
  markMeal,
  getMeals,
  getMealStats,
  deleteMeal,
} from "../controllers/mealController";
import { authMiddleware, adminOnly, memberOnly } from "../middlewares/auth";

const router = Router();

router.post("/", authMiddleware, markMeal);
router.get("/", authMiddleware, getMeals);
router.get("/stats", authMiddleware, getMealStats);
router.delete("/:id", authMiddleware, deleteMeal);

export default router;
