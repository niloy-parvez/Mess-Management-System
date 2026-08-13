import { Router } from "express";
import { register, login, getCurrentUser, changePassword, refreshToken } from "../controllers/authController";
import { forgotPassword, resetPassword } from "../controllers/passwordResetController";
import { authMiddleware } from "../middlewares/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.get("/me", authMiddleware, getCurrentUser);
// Debug-only endpoint to show mapping between JWT id, auth.users, public.users and members
if (process.env.NODE_ENV !== "production") {
  const { authMapping, resolveCreatedBy } = require("../controllers/debugController");
  router.get("/debug/auth-map", authMiddleware, authMapping);
  router.get("/debug/resolve-created-by", authMiddleware, resolveCreatedBy);
}
router.post("/change-password", authMiddleware, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
