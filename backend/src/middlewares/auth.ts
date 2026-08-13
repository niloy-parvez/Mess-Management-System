import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config";
import supabase, { supabaseClient } from "../config/supabase";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    authId: string;
    email: string;
    role: "admin" | "member";
    profileId?: string;
    memberId?: string;
    isActive?: boolean;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const hasBearerPrefix = typeof authHeader === "string" && authHeader.startsWith("Bearer ");
    const token = hasBearerPrefix ? authHeader.slice("Bearer ".length).trim() : "";

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authorization header must be in the format: Bearer <token>",
        error: "Unauthorized",
      });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      email: string;
      role: "admin" | "member";
    };

    // No sensitive logging in authentication middleware for production.

    let authUser: any = null;
    let adminLookupFailed = false;
    try {
      const authResp = await supabase.auth.admin.getUserById(decoded.id);
      authUser = authResp?.data?.user || null;
    } catch (lookupErr: any) {
      const msg = String(lookupErr?.message || "").toLowerCase();
      // If the service-role key is unregistered or not usable, fall back to trusting the JWT
      if (msg.includes("unregistered api key") || (((lookupErr as any)?.status === 401) || ((lookupErr as any)?.statusCode === 401))) {
        adminLookupFailed = true;
        console.warn("[Auth] Service-role lookup failed (unregistered API key). Falling back to token-based identity resolution.");
      } else {
        // For other unexpected errors, return server error
        console.error("[Auth] Failed to validate token via service-role lookup", lookupErr);
        res.status(500).json({ success: false, message: "Failed to validate token", error: "Internal Server Error" });
        return;
      }
    }

    // If service-role lookup returned no user, fall back to anon profile lookup instead of rejecting immediately.
    if (!authUser && !adminLookupFailed) {
      adminLookupFailed = true;
      console.warn('[Auth] Service-role lookup returned no user; falling back to anon profile lookup.');
    }

    const authMeta = (authUser?.user_metadata || {}) as {
      role?: string;
      full_name?: string;
      phone?: string;
      is_active?: boolean;
    };

    // Use service-role supabase when available; fall back to anon client when service-role lookups failed
    const profileClient = adminLookupFailed ? supabaseClient : supabase;
    const { data: profileLookup, error: profileLookupError } = await profileClient
      .from("users")
      .select("id, auth_id, email, name, phone, role, is_active")
      .eq("auth_id", decoded.id)
      .maybeSingle();

    // Diagnostic log for profile lookup (no secrets)
    try {
      console.info('[Auth] Profile lookup', { authUserId: decoded.id, adminLookupFailed, profileFound: !!profileLookup, profileLookupError: profileLookupError ? ((profileLookupError as any)?.message || String(profileLookupError)) : null });
    } catch (e) {}

    // If profile lookup failed due to an invalid service-role key or RLS restrictions,
    // fall back to using token metadata instead of failing the request. This avoids
    // incorrectly rejecting valid tokens when admin lookups are unavailable.
    if (profileLookupError) {
      try {
        const { isServiceRoleKeyProblem } = await import("../utils/dbHelpers");
        if (isServiceRoleKeyProblem(profileLookupError)) {
          console.error('[Auth] Profile lookup failed due to service-role or RLS issue; cannot safely resolve user profile.');
          res.status(503).json({
            success: false,
            message: 'Supabase service-role key invalid or RLS preventing profile resolution. Contact administrator to restore SUPABASE_SERVICE_ROLE_KEY or adjust RLS policies.',
            error: 'Service Unavailable',
          });
          return;
        } else {
          res.status(500).json({
            success: false,
            message: "Failed to resolve user profile",
            error: "Internal Server Error",
          });
          return;
        }
      } catch (e) {
        // If helper import fails, conservatively return internal server error
        res.status(500).json({ success: false, message: "Failed to resolve user profile", error: "Internal Server Error" });
        return;
      }
    }

    let profile = profileLookup;

    if (!profile?.id) {
      // Safe fallbacks: use optional chaining to avoid TypeError when authUser is null
      const fallbackEmail = ((authUser && authUser.email) || decoded.email || "").toLowerCase();
      const fallbackName =
        (typeof authMeta.full_name === "string" && authMeta.full_name.trim()) ||
        (fallbackEmail ? fallbackEmail.split("@")[0] : "Member");
      const fallbackRole =
        authMeta.role === "admin" || authMeta.role === "member" ? authMeta.role : decoded.role;

      // Log diagnostic info (safe, non-secret)
      try {
        console.info("[Auth][Diagnostics] Profile missing; constructing fallback profile (no DB writes)", {
          authUserId: decoded.id,
          fallbackEmail: fallbackEmail || null,
          fallbackName,
          fallbackRole,
          adminLookupFailed,
        });
      } catch (e) {
        // ignore logging errors
      }

      // If adminLookupFailed (service-role unavailable), do NOT construct an in-memory profile or attempt writes.
      if (adminLookupFailed) {
        console.error('[Auth] Service-role key unavailable or invalid; cannot resolve user profile via admin client.');
        res.status(503).json({
          success: false,
          message: 'Supabase service-role key is invalid or unavailable. Server cannot resolve user profiles. Contact administrator to restore SUPABASE_SERVICE_ROLE_KEY.',
          error: 'Service Unavailable',
        });
        return;
      } else {
        // If service-role is available, upsert a canonical profile using the service client
        const { data: upsertedProfile, error: profileUpsertError } = await supabase
          .from("users")
          .upsert(
            [
              {
                id: decoded.id,
                auth_id: decoded.id,
                email: fallbackEmail,
                name: fallbackName,
                phone: authMeta.phone || null,
                role: fallbackRole,
                is_active: authMeta.is_active !== false,
              },
            ],
            { onConflict: "auth_id" }
          )
          .select("id, auth_id, email, name, phone, role, is_active")
          .maybeSingle();

        if (profileUpsertError) {
          console.error('[Auth] Profile upsert failed', { authUserId: decoded.id, error: (profileUpsertError as any)?.message });
          res.status(500).json({
            success: false,
            message: "Failed to provision user profile",
            error: "Internal Server Error",
          });
          return;
        }

        profile = upsertedProfile;
      }
    }

    if (!profile?.id) {
      res.status(403).json({
        success: false,
        message: "User profile not found. Please contact admin.",
        error: "Forbidden",
      });
      return;
    }

    if (profile.is_active === false) {
      res.status(403).json({
        success: false,
        message: "User account is inactive",
        error: "Forbidden",
      });
      return;
    }

    const { data: memberLookup, error: memberLookupError } = await profileClient
      .from("members")
      .select("id, user_id, is_active")
      .in("user_id", [profile.id, decoded.id])
      .maybeSingle();

    if (memberLookupError) {
      res.status(500).json({
        success: false,
        message: "Failed to resolve member profile",
        error: "Internal Server Error",
      });
      return;
    }

    const role =
      (profile && (profile.role === "admin" || profile.role === "member"))
        ? profile.role
        : (authMeta && (authMeta.role === "admin" || authMeta.role === "member"))
          ? authMeta.role
          : decoded.role;

    let memberId = memberLookup?.id;

    if (role === "member" && !memberId) {
      const { ensureMemberForAuthUser } = await import("../services/memberService");
      const ensureResult = await ensureMemberForAuthUser({
        id: decoded.id,
        email: (profile && profile.email) || (authUser && authUser.email) || decoded.email || null,
        full_name: (profile && profile.name) || authMeta.full_name || null,
        phone: (profile && profile.phone) || authMeta.phone || null,
      });

      if (ensureResult?.error) {
        res.status(500).json({
          success: false,
          message: "Failed to resolve member profile",
          error: "Internal Server Error",
        });
        return;
      }

      memberId = ensureResult?.memberId || memberId;
    }

    if (role === "member" && !memberId) {
      res.status(403).json({
        success: false,
        message: "Member profile is not linked to this user",
        error: "Forbidden",
      });
      return;
    }

    req.user = {
      id: decoded.id,
      authId: decoded.id,
      email: profile.email || decoded.email,
      role,
      profileId: profile.id,
      memberId,
      isActive: profile.is_active !== false,
    };
    next();
  } catch (error: any) {
    console.error('[Auth] Token verification error', error && (error.stack || error.message || error));
    res.status(401).json({
      success: false,
      message: "Invalid token",
      error: "Unauthorized",
    });
  }
};

export const adminOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.isActive === false) {
    res.status(403).json({
      success: false,
      message: "User account is inactive",
      error: "Forbidden",
    });
    return;
  }

  if (req.user?.role !== "admin") {
    res.status(403).json({
      success: false,
      message: "Admin access required",
      error: "Forbidden",
    });
    return;
  }
  next();
};

export const memberOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.isActive === false) {
    res.status(403).json({
      success: false,
      message: "User account is inactive",
      error: "Forbidden",
    });
    return;
  }

  if (req.user?.role !== "member" && req.user?.role !== "admin") {
    res.status(403).json({
      success: false,
      message: "Member access required",
      error: "Forbidden",
    });
    return;
  }
  next();
};
