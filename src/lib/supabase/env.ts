// Static `process.env.NEXT_PUBLIC_*` reads so Next inlines them at build
// time (Vercel Production / Preview and local `.env.local`).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseEnv() {
  if (!supabaseUrl || !supabasePublishableKey) return null;
  return { url: supabaseUrl, publishableKey: supabasePublishableKey };
}
