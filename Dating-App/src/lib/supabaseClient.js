import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: log env status at app start (without leaking full keys)
console.log("[Supabase] env check", {
  url: supabaseUrl,
  urlStartsWithHttps: supabaseUrl?.startsWith("https://") ?? false,
  urlHasTrailingSlash: supabaseUrl ? supabaseUrl.endsWith("/") : null,
  anonKeyPresent: Boolean(supabaseAnonKey),
  anonKeyPreview: supabaseAnonKey ? `${supabaseAnonKey.slice(0, 4)}...` : null,
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[Supabase] Missing env vars. Make sure .env (same level as package.json) has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and that you restarted npm run dev."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'sb-ebuatmrcfzxonhlsxmjp-auth-token',
  },
});

// Simple connectivity test you can call from anywhere
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log("[Supabase] getSession result", { data, error });
    if (error) {
      console.error("Supabase test failed:", error.message, error);
    } else {
      console.log("Supabase connection OK. Current session:", data);
    }
  } catch (err) {
    console.error("Supabase test threw error:", err);
  }
}