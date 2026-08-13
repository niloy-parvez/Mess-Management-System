import supabase from "../config/supabase";

export const isMissingTableError = (error: any): boolean => {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    error?.code === "PGRST205" ||
    message.includes("could not find the table") ||
    message.includes("schema cache")
  );
};

const mapUserToMember = (user: any) => ({
  id: user.id || null,
  email: (user.email || user.user_metadata?.email || "").toString().toLowerCase(),
  name:
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "Member",
  phone: user.user_metadata?.phone || null,
  room_number:
    user.user_metadata?.room_number || `signup-${String(user.id || Date.now()).slice(0, 8)}`,
  join_date: user.user_metadata?.join_date || new Date().toISOString().split("T")[0],
  notes: user.user_metadata?.notes || "Auto-created member profile from auth sync",
  is_active: user.user_metadata?.is_active !== false,
});

export const loadMembersFromAuthUsersFallback = async (): Promise<any[]> => {
  const members: any[] = [];
  const perPage = 100;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const users = (data?.users || []).filter((user: any) => {
      const role = user.user_metadata?.role;
      return role !== "admin";
    });

    members.push(...users.map(mapUserToMember));

    if (!data?.users || data.users.length < perPage) {
      break;
    }
    page += 1;
  }

  return members;
};

export const findMemberByIdInAuthUsers = async (memberId: string): Promise<any | null> => {
  const perPage = 100;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const user = (data?.users || []).find((item: any) => item.id === memberId);
    if (user) {
      return mapUserToMember(user);
    }

    if (!data?.users || data.users.length < perPage) {
      break;
    }
    page += 1;
  }

  return null;
};

export const syncMembersFromAuthUsers = async (): Promise<number> => {
  const { data: existingMembers, error: existingMembersError } = await supabase
    .from("members")
    .select("email");

  if (existingMembersError) {
    throw existingMembersError;
  }

  const existingEmails = new Set(
    (existingMembers || []).map((member: any) => String(member.email || "").toLowerCase())
  );

  const authMembers = await loadMembersFromAuthUsersFallback();
  const newMembers = authMembers
    .filter((member) => member.email && !existingEmails.has(member.email.toLowerCase()))
    .map((member) => ({
      // Set user_id to the auth user id (member.id comes from auth user id in the mapping)
      user_id: member.id || null,
      email: String(member.email || "").toLowerCase(),
      name: member.name || member.email || "Member",
      phone: member.phone || null,
      room_number: member.room_number || `signup-${String(member.id || Date.now()).slice(0, 8)}`,
      join_date: member.join_date || new Date().toISOString().split("T")[0],
      notes: member.notes || "Auto-created member profile from auth sync",
      is_active: member.is_active !== false,
    }));

  if (newMembers.length === 0) {
    return 0;
  }

  const { data: insertedMembers, error: insertError } = await supabase
    .from("members")
    .insert(newMembers)
    .select("id");

  if (insertError) {
    throw insertError;
  }

  return (insertedMembers || []).length;
};
