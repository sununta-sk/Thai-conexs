require('dotenv').config({ path: '../.env' });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("[authMiddleware] Missing or malformed Authorization header");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    let finalUser = user;

    // Dev fallback: decode JWT payload if Supabase validation fails
    if ((!finalUser || error) && token) {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], "base64").toString("utf8");
          const payload = JSON.parse(payloadJson);
          finalUser = {
            id: payload.sub,
            email: payload.email,
            ...payload,
          };
          console.warn("[authMiddleware] Using decoded JWT payload as user (dev fallback)");
        }
      } catch (e) {
        console.warn("[authMiddleware] Failed to decode JWT payload", e.message);
      }
    }

    if (!finalUser) {
      console.warn("[authMiddleware] Invalid token", {
        hasError: !!error,
        hasUser: !!user,
      });
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = finalUser;
    next();
  } catch (err) {
    console.error("[authMiddleware] Unexpected error", err);
    return res.status(401).json({ message: "Unauthorized" });
  }
}

module.exports = { authMiddleware };