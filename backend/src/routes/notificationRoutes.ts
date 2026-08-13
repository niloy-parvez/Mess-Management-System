import { Router } from "express";
import {
  getNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controllers/notificationController";
import { authMiddleware } from "../middlewares/auth";

const router = Router();

router.get("/", authMiddleware, getNotifications);
router.get("/unread/count", authMiddleware, getUnreadNotifications);
router.post("/:notificationId/read", authMiddleware, markAsRead);
router.post("/read-all", authMiddleware, markAllAsRead);
router.delete("/:notificationId", authMiddleware, deleteNotification);

export default router;
