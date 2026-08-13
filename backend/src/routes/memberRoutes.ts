import { Router } from "express";
import {
  createMember,
  getAllMembers,
  getMemberById,
  updateMember,
  deactivateMember,
  activateMember,
} from "../controllers/memberController";
import { 
  uploadMemberPhoto,
  deleteMember,
  getDeletedMembers,
  restoreMember 
} from "../controllers/memberFileController";
import { authMiddleware, adminOnly } from "../middlewares/auth";

const router = Router();

router.post("/", authMiddleware, adminOnly, createMember);
router.get("/", authMiddleware, getAllMembers);
router.get("/deleted", authMiddleware, adminOnly, getDeletedMembers);
router.get("/:id", authMiddleware, getMemberById);
router.patch("/:id", authMiddleware, adminOnly, updateMember);
router.delete("/:id", authMiddleware, adminOnly, deleteMember);
router.patch("/:id/deactivate", authMiddleware, adminOnly, deactivateMember);
router.patch("/:id/activate", authMiddleware, adminOnly, activateMember);
router.patch("/:id/restore", authMiddleware, adminOnly, restoreMember);
router.post("/:id/upload-photo", authMiddleware, uploadMemberPhoto);

export default router;
