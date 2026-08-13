import { Router } from "express";
import {
  createBackup,
  downloadBackup,
  restoreBackup,
  getBackupHistory,
  deleteOldBackups,
  getRecycleBin,
  permanentlyDeleteMember,
} from "../controllers/backupController";
import { authMiddleware, adminOnly } from "../middlewares/auth";

const router = Router();

// Backup endpoints
router.post("/create", authMiddleware, adminOnly, createBackup);
router.get("/download/:backupId", authMiddleware, adminOnly, downloadBackup);
router.post("/restore/:backupId", authMiddleware, adminOnly, restoreBackup);
router.get("/history", authMiddleware, adminOnly, getBackupHistory);
router.delete("/cleanup", authMiddleware, adminOnly, deleteOldBackups);

// Recycle bin endpoints
router.get("/recycle-bin", authMiddleware, adminOnly, getRecycleBin);
router.delete("/recycle-bin/:memberId", authMiddleware, adminOnly, permanentlyDeleteMember);

export default router;
