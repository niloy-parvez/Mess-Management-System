import { Request, Response } from "express";
import config from "../config";
import { supabase, supabaseClient } from "../config/supabase";
import { generateToken } from "../utils/auth";
import { sendSuccess, sendError } from "../utils/response";
import { AuthRequest } from "../middlewares/auth";

const logAuthError = (
  message: string,
  error: any,
  extra?: Record<string, unknown>
): void => {
  const normalizedError = error || {};
  const logDetails: Record<string, unknown> = {
    message: normalizedError.message || String(error),
    code: normalizedError.code,
    status: normalizedError.status ?? normalizedError.statusCode,
    details: normalizedError.details,
    hint: normalizedError.hint,
    requestId: normalizedError.requestId,
    stack: normalizedError.stack,
    raw: normalizedError,
    ...extra,
  };

  if (
    config.supabaseUrl.includes("placeholder") ||
    config.supabaseAnonKey.includes("placeholder") ||
    config.supabaseServiceRoleKey.includes("placeholder")
  ) {
    logDetails.configHint =
      "Supabase environment variables appear to be unset or using placeholder values. Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.";
  }

  console.error("[Auth]", message, logDetails);
};

const isMissingUsersTableError = (error: any): boolean => {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    error?.code === "PGRST205" ||
    message.includes("could not find the table 'public.users'") ||
    message.includes("could not find the table public.users")
  );
};

const isMissingTableError = (error: any): boolean => {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    error?.code === "PGRST205" ||
    message.includes("could not find the table") ||
    message.includes("schema cache")
  );
};

const isMissingColumnError = (error: any): boolean => {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("column") && message.includes("does not exist");
};

const getProfileByAuthId = async (authId: string) => {
  // Prefer service-role supabase but fall back to anon client if service-role calls are not available
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, auth_id, email, name, phone, role, avatar_url, is_active, created_at, updated_at")
      .eq("auth_id", authId)
      .maybeSingle();

    if (error && !isMissingUsersTableError(error)) {
      // If error indicates unregistered API key / auth admin disabled, retry with anon client
      const msg = String(error?.message || "").toLowerCase();
      if (msg.includes("unregistered api key") || ((error as any)?.status === 401)) {
        // fall through to anon client
      } else {
        throw error;
      }
    }

    if (data) return data;
  } catch (e: any) {
    const msg = String(e?.message || "").toLowerCase();
    if (!(msg.includes("unregistered api key") || ((e as any)?.status === 401))) {
      // propagate only non-service-key errors
      throw e;
    }
  }

  // Fallback to anon client
  const { data: anonData, error: anonError } = await supabaseClient
    .from("users")
    .select("id, auth_id, email, name, phone, role, avatar_url, is_active, created_at, updated_at")
    .eq("auth_id", authId)
    .maybeSingle();

  if (anonError && !isMissingUsersTableError(anonError)) {
    throw anonError;
  }

  return anonData;
};

const syncCanonicalProfile = async ({
  authUserId,
  email,
  name,
  phone,
  role,
  isActive,
}: {
  authUserId: string;
  email: string;
  name: string;
  phone?: string | null;
  role: "admin" | "member";
  isActive: boolean;
}) => {
  const profile = await getProfileByAuthId(authUserId);

  const payload = {
    auth_id: authUserId,
    email,
    name,
    phone: phone || null,
    role,
    is_active: isActive,
  } as Record<string, unknown>;

  // Try service-role upsert first; if that fails due to unregistered key, fall back to anon client
  try {
    if (profile && profile.id) {
      const { data, error } = await supabase
        .from("users")
        .update(payload)
        .eq("id", profile.id)
        .select("id, auth_id, email, name, phone, role, avatar_url, is_active, created_at, updated_at")
        .maybeSingle();

      if (error && !isMissingUsersTableError(error)) {
        const msg = String(error?.message || "").toLowerCase();
        if (!(msg.includes("unregistered api key") || (((error as any)?.status === 401) || ((error as any)?.statusCode === 401)))) {
          throw error;
        }
      }

      if (data) return data;
    }

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          id: authUserId,
          auth_id: authUserId,
          email,
          name,
          phone: phone || null,
          role,
          is_active: isActive,
        },
      ])
      .select("id, auth_id, email, name, phone, role, avatar_url, is_active, created_at, updated_at")
      .maybeSingle();

    if (error && !isMissingUsersTableError(error)) {
      const msg = String(error?.message || "").toLowerCase();
      if (!(msg.includes("unregistered api key") || (((error as any)?.status === 401) || ((error as any)?.statusCode === 401)))) {
        throw error;
      }
    }

    if (data) return data;
  } catch (e: any) {
    const msg = String(e?.message || "").toLowerCase();
    if (!(msg.includes("unregistered api key") || ((e as any)?.status === 401))) {
      throw e;
    }
  }

  // Fallback to anon client for upsert/insert
  if (profile && profile.id) {
    const { data, error } = await supabaseClient
      .from("users")
      .update(payload)
      .eq("id", profile.id)
      .select("id, auth_id, email, name, phone, role, avatar_url, is_active, created_at, updated_at")
      .maybeSingle();

    if (error && !isMissingUsersTableError(error)) {
      throw error;
    }

    return data || profile;
  }

  const { data, error } = await supabaseClient
    .from("users")
    .insert([
      {
        id: authUserId,
        auth_id: authUserId,
        email,
        name,
        phone: phone || null,
        role,
        is_active: isActive,
      },
    ])
    .select("id, auth_id, email, name, phone, role, avatar_url, is_active, created_at, updated_at")
    .maybeSingle();

  if (error && !isMissingUsersTableError(error)) {
    throw error;
  }

  return data;
};

const getMemberIdForAuthUser = async (authUserId: string): Promise<string | null> => {
  try {
    const { data: authMemberRecord, error: authMemberError } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", authUserId)
      .maybeSingle();

    if (!authMemberError && authMemberRecord?.id) {
      return authMemberRecord.id;
    }

    if (authMemberError && !isMissingTableError(authMemberError)) {
      throw authMemberError;
    }

    const profile = await getProfileByAuthId(authUserId);
    if (profile?.id) {
      const { data: legacyMemberRecord, error: legacyMemberError } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", profile.id)
        .maybeSingle();
 
      if (legacyMemberError && !isMissingTableError(legacyMemberError)) {
        throw legacyMemberError;
      }
 
      if (legacyMemberRecord?.id) {
        await supabase
          .from("members")
          .update({ user_id: authUserId })
          .eq("id", legacyMemberRecord.id);
        return legacyMemberRecord.id;
      }
    }

    return null;
  } catch (e) {
    return null;
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, full_name, name, phone } = req.body;
    const normalizedName = (full_name || name || "").trim();

    if (!email || !password || !normalizedName) {
      sendError(res, "Missing required fields", undefined, 400);
      return;
    }

    // Normalize values for consistency with the database schema
    const normalizedEmail = email.toLowerCase().trim();

    if (
      config.supabaseUrl.includes("placeholder") ||
      config.supabaseAnonKey.includes("placeholder") ||
      config.supabaseServiceRoleKey.includes("placeholder")
    ) {
      const placeholderError = new Error(
        "Supabase environment variables are not configured. Ensure SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are set."
      );
      logAuthError("Supabase configuration issue", placeholderError, {
        supabaseUrl: config.supabaseUrl,
        supabaseAnonKey: config.supabaseAnonKey,
        supabaseServiceRoleKey: config.supabaseServiceRoleKey,
      });
      sendError(
        res,
        "Failed to create user",
        "Supabase environment is not configured. Check backend environment variables.",
        500
      );
      return;
    }

    const { data: authCreateData, error: authCreateError } =
      await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: normalizedName,
          phone,
          role: "member",
          is_active: true,
        },
      });

    if (authCreateError || !authCreateData?.user) {
      const duplicateEmailError =
        authCreateError?.code === "user_already_exists" ||
        authCreateError?.message?.toLowerCase().includes("already registered") ||
        authCreateError?.message?.toLowerCase().includes("already exists");

      logAuthError(
        "Failed to create Supabase Auth user",
        authCreateError || new Error("Supabase auth registration returned no user"),
        {
          email: normalizedEmail,
          response: authCreateData,
        }
      );

      if (duplicateEmailError) {
        sendError(res, "User already exists", undefined, 409);
        return;
      }

      sendError(
        res,
        "Failed to create user",
        (authCreateError as any)?.message || "Supabase auth registration failed",
        (authCreateError as any)?.status || 500
      );
      return;
    }

    const authUser = authCreateData.user;
    const userMetadata = authUser.user_metadata || {};
    const userRole =
      userMetadata.role === "admin" || userMetadata.role === "member"
        ? userMetadata.role
        : "member";
    const isActive = userMetadata.is_active !== false;

    let profileUser = null;
    let profileCreated = false;
    let memberCreated = false;

    try {
      // Ensure a public.users profile exists for backward compatibility with legacy FKs.
      const profileData = await syncCanonicalProfile({
        authUserId: authUser.id,
        email: normalizedEmail,
        name: normalizedName,
        phone: phone || null,
        role: userRole,
        isActive,
      });
      profileUser = profileData;
      profileCreated = true;
    } catch (profileError) {
      if (isMissingUsersTableError(profileError)) {
        logAuthError(
          "Users profile table missing during registration",
          profileError,
          { authUserId: authUser.id, email: normalizedEmail }
        );
      } else {
        logAuthError("Failed to upsert public user record", profileError, {
          authUserId: authUser.id,
          email: normalizedEmail,
        });
        try { await supabase.auth.admin.deleteUser(authUser.id); } catch (e) { /* ignore deletion failure */ }
        sendError(
          res,
          "Failed to create user",
          (profileError as any)?.message || "Failed to sync user profile",
          (profileError as any)?.status || 500
        );
        return;
      }
    }

    try {
      // Ensure a canonical member exists for this auth user. This function will attempt
      // to insert using auth.users.id and fall back to legacy public.users mapping if needed.
      const { ensureMemberForAuthUser } = await import("../services/memberService");
      const ensureResult = await ensureMemberForAuthUser({
        id: authUser.id,
        email: normalizedEmail,
        full_name: normalizedName,
        phone,
      });

      if (ensureResult?.error) {
        // If the error is due to missing members table, log and continue. For other errors,
        // attempt to rollback auth user to avoid orphaned auth accounts.
        const errMsg = String((ensureResult.error as any)?.message || ensureResult.error || "");
        if (errMsg.toLowerCase().includes("could not find the table") || errMsg.toLowerCase().includes("schema cache") || errMsg.toLowerCase().includes("violates foreign key")) {
          // Log the members table / FK issue but continue to return registration success to the client.
          // This prevents registration from failing due to existing DB migration differences. Admin should
          // run migrations or provide the legacy public.users table mapping so that member profiles can be auto-created.
          logAuthError("Members table or FK issue during registration (continuing without member record)", ensureResult.error, {
            authUserId: authUser.id,
            email: normalizedEmail,
          });
        } else {
          logAuthError("Failed to ensure member record during registration", ensureResult.error, {
            authUserId: authUser.id,
            email: normalizedEmail,
          });
          // Non-recoverable error: rollback created auth user to avoid orphaned auth accounts
          try {
            await supabase.auth.admin.deleteUser(authUser.id);
          } catch (delErr) {
            logAuthError("Failed to delete auth user after member create failure", delErr, { authUserId: authUser.id });
          }

          sendError(
            res,
            "Failed to create user",
            (ensureResult.error as any)?.message || "Could not save member record",
            (ensureResult.error as any)?.status || 500
          );
          return;
        }
      } else if (ensureResult?.memberId) {
        memberCreated = true;
      }
    } catch (memberInsertError) {
      // Any unexpected errors — rollback and return
      logAuthError("Failed to ensure member record during registration", memberInsertError, {
        authUserId: authUser.id,
        email: normalizedEmail,
      });
      try {
        await supabase.auth.admin.deleteUser(authUser.id);
      } catch (delErr) {
        logAuthError("Failed to delete auth user after unexpected member create failure", delErr, { authUserId: authUser.id });
      }
      sendError(
        res,
        "Failed to create user",
        (memberInsertError as any)?.message || "Could not save member record",
        (memberInsertError as any)?.status || 500
      );
      return;
    }

    const responseUser = {
      id: authUser.id,
      auth_id: authUser.id,
      profile_id: profileCreated && profileUser ? profileUser.id : null,
      email: (profileCreated && profileUser ? profileUser.email : authUser.email) || normalizedEmail,
      name: (profileCreated && profileUser ? profileUser.name : userMetadata.full_name || normalizedName) || normalizedName,
      phone: (profileCreated && profileUser ? profileUser.phone : userMetadata.phone || phone || null) || null,
      role: (profileCreated && profileUser ? profileUser.role : userRole) || userRole,
      avatar_url: (profileCreated && profileUser ? profileUser.avatar_url : userMetadata.avatar_url || null) || null,
      is_active: profileCreated && profileUser ? profileUser.is_active : isActive,
      created_at: (profileCreated && profileUser ? profileUser.created_at : authUser.created_at) || authUser.created_at,
      updated_at: (profileCreated && profileUser ? profileUser.updated_at : authUser.updated_at) || authUser.updated_at,
    } as Record<string, any>;

    const token = generateToken({
      id: authUser.id,
      email: authUser.email as string,
      role: userRole,
    });

    // Attempt to find the created member record to return its id so frontend can use canonical member source
    let memberId: string | null = null;
    try {
      memberId = await getMemberIdForAuthUser(authUser.id);
      if (!memberId) {
        // If no member exists, try to auto-provision one (backward-compatible with legacy schema)
        const { ensureMemberForAuthUser } = await import("../services/memberService");
        const ensureResult = await ensureMemberForAuthUser({
          id: authUser.id,
          email: normalizedEmail,
          full_name: userMetadata.full_name || normalizedName,
          phone: userMetadata.phone || null,
        });
        if (ensureResult && ensureResult.memberId) memberId = ensureResult.memberId;
      }
    } catch (e) {
      // ignore lookup errors
    }

    try {
      // Intentionally avoid logging sensitive token previews in production
    } catch (e) {
      // ignore
    }

    sendSuccess(
      res,
      {
        user: {
          id: responseUser.id,
          profile_id: responseUser.profile_id,
          email: responseUser.email,
          full_name: responseUser.name,
          phone: responseUser.phone,
          role: responseUser.role,
          avatar_url: responseUser.avatar_url,
          is_active: responseUser.is_active,
          created_at: responseUser.created_at,
          updated_at: responseUser.updated_at,
        },
        member_id: memberId,
        token,
      },
      "User registered successfully",
      201
    );
  } catch (error: any) {
    logAuthError("Unexpected registration error", error);
    sendError(res, "Registration failed", error.message, 500);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendError(res, "Email and password are required", undefined, 400);
      return;
    }

    const normalizedEmail = email.toLowerCase();

    const {
      data: signInData,
      error: signInError,
    } = await supabaseClient.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError || !signInData?.session) {
      console.error("[Auth][Login] Sign-in failed", {
        message: (signInError as any)?.message,
        code: (signInError as any)?.code,
        status: (signInError as any)?.status,
        details: (signInError as any)?.details,
        hint: (signInError as any)?.hint,
      });
      sendError(res, "Invalid credentials", undefined, 401);
      return;
    }

    const authUser = signInData.user;
    const userMetadata = authUser?.user_metadata || {};
    const authUserId = authUser?.id as string;

    let profile = null;
    try {
      profile = await getProfileByAuthId(authUserId);
      if (profile && profile.id !== authUserId) {
        profile = await syncCanonicalProfile({
          authUserId,
          email: profile.email || normalizedEmail,
          name: profile.name || userMetadata.full_name || normalizedEmail,
          phone: profile.phone || userMetadata.phone || null,
          role: profile.role === "admin" || profile.role === "member" ? profile.role : "member",
          isActive: profile.is_active !== false,
        });
      }
    } catch (profileError) {
      logAuthError("Failed to load user profile during login", profileError, {
        authUserId,
        email: normalizedEmail,
      });
    }

    const userRole =
      profile?.role === "admin" || profile?.role === "member"
        ? profile.role
        : userMetadata.role === "admin" || userMetadata.role === "member"
        ? userMetadata.role
        : "member";

    const isActive =
      profile?.is_active !== undefined
        ? profile.is_active
        : userMetadata.is_active !== false;

    if (!isActive) {
      sendError(res, "User account is inactive", undefined, 403);
      return;
    }

    const token = generateToken({
      id: authUserId,
      email: (profile?.email as string) || (authUser?.email as string) || normalizedEmail,
      role: userRole,
    });

    // Log ids and token payload for tracing (do not print full token)
    // Avoid logging sensitive token information in production.

    // Ensure the member linkage is present for this auth user and include a canonical member_id in the response.
    let memberId = await getMemberIdForAuthUser(authUserId);
    if (!memberId) {
      try {
        const { ensureMemberForAuthUser } = await import("../services/memberService");
        const ensureResult = await ensureMemberForAuthUser({
          id: authUserId,
          email: (profile?.email as string) || (authUser?.email as string) || normalizedEmail,
          full_name: profile?.name || userMetadata.full_name || authUser?.email || normalizedEmail,
          phone: profile?.phone || userMetadata.phone || null,
        });
        if (ensureResult?.memberId) {
          memberId = ensureResult.memberId;
        }
      } catch (e) {
        // Ignore member auto-provisioning issues in login flow; the auth identity remains authoritative.
      }
    }

    sendSuccess(
      res,
      {
        user: {
          id: authUserId,
          auth_id: authUserId,
          profile_id: profile?.id ?? null,
          email: (profile?.email as string) || authUser?.email,
          full_name:
            profile?.name || userMetadata.full_name || authUser?.email || normalizedEmail,
          phone: profile?.phone || userMetadata.phone || null,
          role: userRole,
          avatar_url: profile?.avatar_url || userMetadata.avatar_url || null,
          is_active: isActive,
          created_at: profile?.created_at || authUser?.created_at,
          updated_at: profile?.updated_at || authUser?.updated_at,
        },
        member_id: memberId,
        token,
      },
      "Login successful"
    );
  } catch (error: any) {
    console.error("[Auth][Login] Unexpected error", error);
    sendError(res, "Login failed", error.message, 500);
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Accept an expired token and attempt to re-issue a fresh JWT if the auth user still exists
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ success: false, message: "No token provided for refresh", error: "Unauthorized" });
      return;
    }

    const token = String(authHeader).split(" ")[1];
    if (!token) {
      res.status(401).json({ success: false, message: "No token provided for refresh", error: "Unauthorized" });
      return;
    }

    // Decode token without verifying expiry to extract id
    const decoded = require("jsonwebtoken").decode(token) as any;
    const authUserId = decoded?.id;
    if (!authUserId) {
      res.status(401).json({ success: false, message: "Invalid token payload for refresh", error: "Unauthorized" });
      return;
    }

    // Ensure user exists in Supabase auth
    let authUser: any = null;
    let adminLookupFailed = false;
    try {
      const { data: authData, error: fetchUserError } = await supabase.auth.admin.getUserById(authUserId);
      if (fetchUserError) throw fetchUserError;
      authUser = authData?.user || null;
    } catch (lookupErr: any) {
      const msg = String(lookupErr?.message || "").toLowerCase();
      if (msg.includes("unregistered api key") || (lookupErr?.status === 401)) {
        adminLookupFailed = true;
        console.warn('[Refresh] Service-role lookup failed; falling back to profile lookup via anon client');
      } else {
        res.status(401).json({ success: false, message: "Auth user not found", error: "Unauthorized" });
        return;
      }
    }

    // If we have authUser from service-role use it, otherwise try to resolve via public.users using anon client
    const userMetadata = authUser?.user_metadata || {};

    // Try to get profile to read role/email
    let profile = null;
    try {
      profile = await getProfileByAuthId(authUserId);
    } catch (e) {
      // ignore
    }

    const userRole = profile?.role || (userMetadata && userMetadata.role === "admin" ? "admin" : (decoded?.role === "admin" ? "admin" : "member"));
    const email = profile?.email || (authUser ? authUser.email : decoded?.email) || "";

    const newToken = generateToken({ id: authUserId, email: String(email), role: userRole as any });

    // Also attempt to find canonical members.id
    let memberId: string | null = null;
    try {
      memberId = await getMemberIdForAuthUser(authUserId);
      if (!memberId) {
        // Try to auto-provision a member record if missing
        const { ensureMemberForAuthUser } = await import("../services/memberService");
        const ensureResult = await ensureMemberForAuthUser({
          id: authUserId,
          email,
          full_name: (authUser?.user_metadata as any)?.full_name || email,
          phone: (authUser?.user_metadata as any)?.phone || null,
        });
        if (ensureResult && ensureResult.memberId) memberId = ensureResult.memberId;
      }
    } catch (e) {
      // ignore
    }

    res.json({ success: true, message: "Token refreshed", data: { token: newToken, member_id: memberId } });
  } catch (error: any) {
    console.error("Failed to refresh token", error?.message || error);
    res.status(500).json({ success: false, message: "Failed to refresh token", error: error?.message || String(error) });
  }
};

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.id) {
      sendError(res, "Unauthorized", undefined, 401);
      return;
    }

    let profile = null;
    try {
      profile = await getProfileByAuthId(req.user.id);
    } catch (profileError) {
      logAuthError("Failed to load user profile during getCurrentUser", profileError, {
        authUserId: req.user.id,
      });
    }

    if (profile) {
      // Also fetch linked member record id when present
      const memberId = await getMemberIdForAuthUser(req.user.id);

      sendSuccess(
        res,
        {
          id: req.user.id,
          auth_id: req.user.id,
          profile_id: profile.id,
          email: profile.email,
          full_name: profile.name,
          phone: profile.phone,
          role: profile.role,
          avatar_url: profile.avatar_url,
          is_active: profile.is_active,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
          member_id: memberId,
        },
        "User fetched successfully"
      );
      return;
    }

    const { data, error } = await supabase.auth.admin.getUserById(req.user.id);

    if (error || !data?.user) {
      sendError(res, "User not found", undefined, 404);
      return;
    }

    const authUser = data.user;
    const metadata = authUser.user_metadata || {};

    // Attempt to find linked member id if present
    const memberId = await getMemberIdForAuthUser(authUser.id);

    sendSuccess(
      res,
      {
        id: authUser.id,
        auth_id: authUser.id,
        profile_id: null,
        email: authUser.email,
        full_name: metadata.full_name || authUser.email,
        phone: metadata.phone || null,
        role:
          metadata.role === "admin" || metadata.role === "member"
            ? metadata.role
            : "member",
        avatar_url: metadata.avatar_url || null,
        is_active: metadata.is_active !== false,
        created_at: authUser.created_at,
        updated_at: authUser.updated_at,
        member_id: memberId,
      },
      "User fetched successfully"
    );
  } catch (error: any) {
    sendError(res, "Failed to fetch user", error.message, 500);
  }
};

export const changePassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      sendError(res, "Old and new passwords are required", undefined, 400);
      return;
    }

    if (!req.user?.id) {
      sendError(res, "Unauthorized", undefined, 401);
      return;
    }

    const authId = req.user.id;

    const { data: updatedAuthUser, error: authError } =
      await supabase.auth.admin.updateUserById(authId, {
        password: newPassword,
      });

    if (authError) {
      console.error("[Auth][ChangePassword] Failed to update Supabase Auth password", {
        message: (authError as any)?.message,
        code: (authError as any)?.code,
        status: (authError as any)?.status,
        details: (authError as any)?.details,
        hint: (authError as any)?.hint,
        authId,
      });
      sendError(
        res,
        "Failed to change password",
        (authError as any)?.message,
        (authError as any)?.status || 500
      );
      return;
    }

    sendSuccess(res, null, "Password changed successfully");
  } catch (error: any) {
    console.error("[Auth][ChangePassword] Unexpected error", error);
    sendError(res, "Password change failed", error.message, 500);
  }
};
