// supabaseClient.js
// Central Supabase client for Bloom. All auth + database calls go through this.
//
// Required environment variables (set in .env.local for dev, and in Vercel project settings for production):
//   VITE_SUPABASE_URL       - Project URL, from Supabase dashboard > Project Settings > API
//   VITE_SUPABASE_ANON_KEY  - "anon" public key, from the same page (NOT the service_role key)
//
// Never commit .env.local. Never expose the service_role key on the client — only the anon key.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Bloom] Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      // keeps the user logged in across page reloads (localStorage under the hood)
    autoRefreshToken: true,    // silently refreshes the access token before it expires
    detectSessionInUrl: true,  // needed for the OAuth (Google) redirect + email confirmation links to work
  },
});
