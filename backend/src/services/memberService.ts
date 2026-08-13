import { supabase } from "../config/supabase";

interface AuthUserInfo {
  id: string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
}

const isMissingTableError = (error: any): boolean => {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    error?.code === "PGRST205" ||
    message.includes("could not find the table") ||
    message.includes("schema cache")
  );
};

const repairMemberUserIdIfNeeded = async (authUserId: string, email?: string | null) => {
  try {
    const profileLookup = await supabase
      .from("users")
      .select("id, auth_id")
      .eq("auth_id", authUserId)
      .maybeSingle();
 
    if (profileLookup.error && !isMissingTableError(profileLookup.error)) {
      return;
    }
 
    const legacyProfileId = profileLookup.data?.id;
    if (!legacyProfileId) {
      return;
    }
 
    // If this auth user has a legacy public.users row with a different id,
    // repair member.user_id mappings to use the canonical auth.users.id.
    if (email) {
      const nullMemberResult = await supabase
        .from("members")
        .update({ user_id: authUserId })
        .is("user_id", null)
        .eq("email", email);
 
      if (nullMemberResult.error && !isMissingTableError(nullMemberResult.error)) {
        console.warn("[MemberService] Failed to repair null member.user_id mapping.", nullMemberResult.error);
      }
    }
 
    const legacyUserResult = await supabase
      .from("members")
      .update({ user_id: authUserId })
      .eq("user_id", legacyProfileId);
 
    if (legacyUserResult.error && !isMissingTableError(legacyUserResult.error)) {
      console.warn("[MemberService] Failed to repair legacy member.user_id mapping.", legacyUserResult.error);
    }
  } catch (err) {
    console.warn("[MemberService] Member identity repair skipped.", err);
  }
};

const normalizeEmail = (email?: string | null): string => {
  return String(email || "").trim().toLowerCase();
};

const findExistingMember = async (email: string, authUserId: string) => {
  try {
    const { data: memberByAuth, error: authError } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", authUserId)
      .maybeSingle();

    if (authError) {
      return { error: authError };
    }
    if (memberByAuth?.id) {
      return { memberId: memberByAuth.id };
    }

    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", authUserId)
      .maybeSingle();
 
    if (profile?.id) {
      const { data: memberByLegacyProfile, error: legacyError } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", profile.id)
        .maybeSingle();
 
      if (legacyError) {
        return { error: legacyError };
      }
      if (memberByLegacyProfile?.id) {
          // Repair legacy member mapping so all future requests resolve via auth.users.id.
          await supabase
            .from("members")
            .update({ user_id: authUserId })
            .eq("id", memberByLegacyProfile.id);
          return { memberId: memberByLegacyProfile.id };
        }
      }

    if (email) {
      const { data: memberByEmail, error: emailError } = await supabase
        .from("members")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (emailError) {
        return { error: emailError };
      }
      if (memberByEmail?.id) {
        return { memberId: memberByEmail.id };
      }
    }

    return { memberId: null };
  } catch (err) {
    return { error: err };
  }
};

export const ensureMemberForAuthUser = async (authUser: AuthUserInfo) => {
  const normalizedEmail = normalizeEmail(authUser.email);
  const displayName = authUser.full_name || authUser.email || `user-${authUser.id.slice(0, 8)}`;

  await repairMemberUserIdIfNeeded(authUser.id, normalizedEmail);

  const existingResult = await findExistingMember(normalizedEmail, authUser.id);
  if (existingResult.error) {
    return { error: existingResult.error };
  }

  if (existingResult.memberId) {
    return { memberId: existingResult.memberId, created: false };
  }

  try {
    const roomNumber = `auto-${authUser.id.slice(0, 8)}`;

    const insertPayload = {
      user_id: authUser.id,
      email: normalizedEmail,
      name: displayName,
      phone: authUser.phone || "",
      room_number: roomNumber,
      join_date: new Date().toISOString().split("T")[0],
      notes: "Auto-created member profile",
      is_active: true,
    } as any;

    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .insert([insertPayload])
      .select("id")
      .maybeSingle();

    if (!memberError && memberData && memberData.id) {
      return { memberId: memberData.id, created: true };
    }

    if (memberError) {
      const msg = String(memberError?.message || "").toLowerCase();
      const duplicateEmail = msg.includes("duplicate") || msg.includes("unique") || msg.includes("already exists");

      if (duplicateEmail) {
        const existingByEmail = await findExistingMember(normalizedEmail, authUser.id);
        if (existingByEmail.error) {
          return { error: existingByEmail.error };
        }
        if (existingByEmail.memberId) {
          return { memberId: existingByEmail.memberId, created: false };
        }
      }

      return { error: memberError };
    }

    return { memberId: null };
  } catch (err) {
    return { error: err };
  }
};
