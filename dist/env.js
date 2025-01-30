import { config } from "dotenv";
import { z } from "zod";
config();
const envSchema = z.object({
    SUPABASE_URL: z.string(),
    SUPABASE_ANON_KEY: z.string(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),
    UPSTASH_REDIS_REST_URL: z.string(),
    UPSTASH_REDIS_REST_TOKEN: z.string(),
    PORT: z.coerce.number().default(8080),
});
export const envConfig = envSchema.parse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_ADMIN_KEY: process.env.SUPABASE_ADMIN_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    PORT: process.env.PORT,
});
