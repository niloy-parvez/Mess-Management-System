import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { sendSuccess, sendError } from "../utils/response";

export const authMapping = async (req: Request, res: Response) => {
  try {
    const requesterId = (req as any).user?.id || null;
    if (!requesterId) {
      return sendError(res, "No authenticated user in request", undefined, 401);
    }

    // Fetch auth user via admin API
    let authUser: any = null;
    try {
      const authResp = await supabase.auth.admin.getUserById(requesterId);
      authUser = authResp?.data?.user || null;
    } catch (e) {
      // ignore — service role may not be configured
    }

    // Fetch legacy public.users profile where auth_id = requesterId
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, auth_id, email, name, phone")
      .eq("auth_id", requesterId)
      .maybeSingle();

    // Fetch member that references requesterId in members.user_id
    const { data: memberByAuth, error: memberAuthError } = await supabase
      .from("members")
      .select("id, user_id, name, email, phone, room_number")
      .eq("user_id", requesterId)
      .maybeSingle();

    // Also attempt to find members that reference the legacy profile id (if profile exists)
    let memberByProfile: any = null;
    if (profile && profile.id) {
      const { data: m2 } = await supabase
        .from("members")
        .select("id, user_id, name, email, phone, room_number")
        .eq("user_id", profile.id)
        .maybeSingle();
      memberByProfile = m2 || null;
    }

    return sendSuccess(res, {
      requesterId,
      authUser: authUser || null,
      profile: profile || null,
      memberByAuth: memberByAuth || null,
      memberByProfile: memberByProfile || null,
    });
  } catch (e: any) {
    console.error("[Debug][authMapping]", e);
    return sendError(res, "Debug mapping failed", e?.message || String(e), 500);
  }
};

export const resolveCreatedBy = async (req: Request, res: Response) => {
  try {
    const requesterId = (req as any).user?.id || null;
    if (!requesterId) return sendError(res, "No authenticated user in request", undefined, 401);

    // Try as auth.users id
    try {
      const { data: authResp } = await supabase.auth.admin.getUserById(requesterId);
      if (authResp && authResp.user && authResp.user.id) {
        return sendSuccess(res, { requesterId, resolved: authResp.user.id, method: 'auth.users' });
      }
    } catch (e) {
      // ignore
    }

    // Try as public.users id
    try {
      const { data: publicUser } = await supabase.from('users').select('id, auth_id').eq('id', requesterId).maybeSingle();
      if (publicUser && publicUser.auth_id) return sendSuccess(res, { requesterId, resolved: publicUser.auth_id, method: 'public.users->auth_id' });
    } catch (e) {
      // ignore
    }

    // Try as member id
    try {
      const { data: memberRec } = await supabase.from('members').select('id, user_id').eq('id', requesterId).maybeSingle();
      if (memberRec && memberRec.user_id) {
        // If member.user_id refers to public.users, map to its auth_id
        const { data: publicUser2 } = await supabase.from('users').select('id, auth_id').eq('id', memberRec.user_id).maybeSingle();
        if (publicUser2 && publicUser2.auth_id) return sendSuccess(res, { requesterId, resolved: publicUser2.auth_id, method: 'members->public.users->auth_id' });
        return sendSuccess(res, { requesterId, resolved: memberRec.user_id, method: 'members->user_id (raw)' });
      }
    } catch (e) {
      // ignore
    }

    return sendError(res, 'Could not resolve requester to an auth.users id', undefined, 404);
  } catch (e: any) {
    console.error('[Debug][resolveCreatedBy]', e);
    return sendError(res, 'Resolve failed', e?.message || String(e), 500);
  }
};
