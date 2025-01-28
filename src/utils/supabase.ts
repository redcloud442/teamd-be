import { createClient } from "@supabase/supabase-js";
import { envConfig } from "../env.js";

const supabaseUrl = envConfig.SUPABASE_URL;
const supabaseAnonKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAnonClient = createClient(
  supabaseUrl,
  envConfig.SUPABASE_ANON_KEY
);
