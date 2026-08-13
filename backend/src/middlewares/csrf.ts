import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import supabase from "../config/supabase";

// Use Supabase public.csrf_tokens table for production persistence
export const generateCSRFToken = async (sessionId: string): Promise<string> => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour

  try {
    await supabase
      .from("csrf_tokens")
      .upsert(
        {
          session_id: sessionId,
          token,
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: "session_id" }
      );
  } catch (error) {
    console.error("[CSRF] Failed to upsert csrf token in DB:", error);
    // Still return token but validation will fail until DB is fixed
  }

  return token;
};

export const csrfProtection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Skip CSRF check for safe methods
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    next();
    return;
  }

  const sessionId = (req.headers["x-session-id"] as string) || "";
  const token = (req.headers["x-csrf-token"] as string) || "";

  if (!sessionId || !token) {
    res.status(403).json({
      success: false,
      message: "CSRF token missing",
      error: "Forbidden",
    });
    return;
  }

  try {
    const { data, error } = await supabase
      .from("csrf_tokens")
      .select("token, expires_at")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) {
      console.error("[CSRF] Failed to read csrf token from DB:", error);
      res.status(500).json({ success: false, message: "CSRF validation failed", error: String(error) });
      return;
    }

    if (!data) {
      res.status(403).json({ success: false, message: "Invalid CSRF session", error: "Forbidden" });
      return;
    }

    const storedToken = String(data.token || "");
    const expiresAt = new Date(String(data.expires_at));

    if (storedToken !== token || expiresAt < new Date()) {
      res.status(403).json({
        success: false,
        message: "Invalid or expired CSRF token",
        error: "Forbidden",
      });
      return;
    }

    next();
  } catch (err) {
    console.error("[CSRF] Unexpected error during csrf validation:", err);
    res.status(500).json({ success: false, message: "CSRF validation error", error: String(err) });
  }
};

export const csrfTokenEndpoint = async (req: Request, res: Response): Promise<void> => {
  const sessionId = (req.headers["x-session-id"] as string) || crypto.randomBytes(16).toString("hex");
  const token = await generateCSRFToken(sessionId);

  res.json({ sessionId, token });
};
