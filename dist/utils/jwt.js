import jwt from "jsonwebtoken";
// Load the Supabase JWT secret (stored in the .env file)
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "your_supabase_jwt_secret";
/**
 * Generate a custom Supabase JWT token.
 * @param userId - The user’s unique identifier.
 * @param role - The user’s role (default: authenticated).
 * @returns A signed JWT token.
 */
export const generateSupabaseJWT = (userId, role = "authenticated") => {
    const payload = {
        sub: userId, // Subject (the user’s unique ID)
        aud: "authenticated", // Audience (required by Supabase)
        role: role, // User role
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // Expiration time (1 hour)
    };
    // Sign the token using Supabase's JWT secret
    return jwt.sign(payload, SUPABASE_JWT_SECRET, {
        algorithm: "HS256",
    });
};
