import { createClient } from "@supabase/supabase-js";
import config from "./index";

export const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  { auth: { persistSession: false } }
);

export const supabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseAnonKey
);

export default supabase;
