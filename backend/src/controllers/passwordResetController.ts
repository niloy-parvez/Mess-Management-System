import { Request, Response } from "express";
import supabase from "../config/supabase";
import { sendSuccess, sendError } from "../utils/response";
import crypto from "crypto";

// In-memory password reset tokens (use Redis in production)
const resetTokens = new Map<string, { email: string; expiresAt: Date }>();

const findAuthUserByEmail = async (email: string) => {
  const normalizedEmail = email.toLowerCase().trim();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const foundUser = data?.users?.find(
      (user: any) => user.email?.toLowerCase() === normalizedEmail
    );

    if (foundUser) {
      return foundUser;
    }

    if (!data?.nextPage) {
      break;
    }

    page = data.nextPage;
  }

  return null;
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      sendError(res, "Email is required", undefined, 400);
      return;
    }

    // Check if user exists
    let authUser = null;

    try {
      authUser = await findAuthUserByEmail(email);
    } catch (error: any) {
      sendError(res, "Failed to process password reset", error.message, 500);
      return;
    }

    if (!authUser) {
      // Don't reveal if email exists for security
      sendSuccess(
        res,
        { message: "If email exists, password reset link has been sent" },
        "Password reset requested"
      );
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    resetTokens.set(resetToken, { email, expiresAt });

    // In production, send email with reset link
    // For now, return token for testing
    sendSuccess(
      res,
      { 
        message: "Password reset link sent to email",
        resetToken: process.env.NODE_ENV === "development" ? resetToken : undefined 
      },
      "Password reset requested"
    );
  } catch (error: any) {
    sendError(res, "Failed to process password reset", error.message, 500);
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      sendError(res, "Token and new password are required", undefined, 400);
      return;
    }

    // Verify token
    const tokenData = resetTokens.get(token);
    if (!tokenData || tokenData.expiresAt < new Date()) {
      sendError(res, "Invalid or expired password reset token", undefined, 400);
      return;
    }

    let authUser = null;
    try {
      authUser = await findAuthUserByEmail(tokenData.email);
    } catch (error: any) {
      sendError(res, "Failed to reset password", error.message, 500);
      return;
    }

    if (!authUser?.id) {
      sendError(res, "Failed to reset password", "User account not found", 404);
      return;
    }

    const { error: authError } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: newPassword,
    });

    if (authError) {
      console.error("[Auth][ResetPassword] Failed to update Supabase Auth password", {
        message: (authError as any)?.message,
        code: (authError as any)?.code,
        status: (authError as any)?.status,
        details: (authError as any)?.details,
        hint: (authError as any)?.hint,
        authId: authUser.id,
      });
      sendError(
        res,
        "Failed to reset password",
        (authError as any)?.message,
        (authError as any)?.status || 500
      );
      return;
    }

    // Remove used token
    resetTokens.delete(token);

    sendSuccess(res, null, "Password reset successfully");
  } catch (error: any) {
    sendError(res, "Failed to reset password", error.message, 500);
  }
};
