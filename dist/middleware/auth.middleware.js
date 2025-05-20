import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { env } from "hono/adapter";
import { setCookie } from "hono/cookie";
export const getSupabase = (c) => {
    return c.get("supabase");
};
export const supabaseMiddleware = () => {
    return async (c, next) => {
        const supabaseEnv = env(c);
        const supabaseUrl = supabaseEnv.SUPABASE_URL;
        const supabaseAnonKey = supabaseEnv.SUPABASE_ANON_KEY;
        if (!supabaseUrl) {
            throw new Error("SUPABASE_URL missing!");
        }
        if (!supabaseAnonKey) {
            throw new Error("SUPABASE_ANON_KEY missing!");
        }
        const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
            cookies: {
                getAll() {
                    return parseCookieHeader(c.req.header("Cookie") ?? "");
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => setCookie(c, name, value, options));
                },
            },
        });
        c.set("supabase", supabase);
        await next();
    };
};
