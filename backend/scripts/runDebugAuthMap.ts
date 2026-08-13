import dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../.env" });

import { supabase } from "../src/config/supabase";

const authId = process.argv[2];
if (!authId) {
  console.error("Usage: ts-node runDebugAuthMap.ts <auth_user_id>");
  process.exit(2);
}

(async () => {
  try {
    console.log("Debug mapping for auth id:", authId);

    try {
      const authResp = await supabase.auth.admin.getUserById(authId);
      console.log("auth.users:", authResp?.data?.user || null);
    } catch (e) {
      console.warn("Failed to get auth user via admin.getUserById", e);
    }

    const { data: profile } = await supabase.from("users").select("id, auth_id, email, name, phone").eq("auth_id", authId).maybeSingle();
    console.log("public.users profile:", profile || null);

    const { data: memberByAuth } = await supabase.from("members").select("id, user_id, name, email, phone, room_number").eq("user_id", authId).maybeSingle();
    console.log("members where user_id = authId:", memberByAuth || null);

    if (profile && profile.id) {
      const { data: memberByProfile } = await supabase.from("members").select("id, user_id, name, email, phone, room_number").eq("user_id", profile.id).maybeSingle();
      console.log("members where user_id = profile.id:", memberByProfile || null);
    }
  } catch (err) {
    console.error(err);
  }
})();
