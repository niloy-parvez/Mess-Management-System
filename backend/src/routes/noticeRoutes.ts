import { Router } from "express";
import {
  createNotice,
  getNotices,
  updateNotice,
  deleteNotice,
} from "../controllers/noticeController";
import { authMiddleware, adminOnly } from "../middlewares/auth";

const router = Router();

router.post("/", authMiddleware, adminOnly, createNotice);
router.get("/", authMiddleware, getNotices);
router.patch("/:id", authMiddleware, adminOnly, updateNotice);
router.delete("/:id", authMiddleware, adminOnly, deleteNotice);

export default router;
