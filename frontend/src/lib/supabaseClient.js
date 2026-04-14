import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
// Support both VITE_SUPABASE_ANON_KEY and VITE_SUPABASE_PUBLISHABLE_KEY
const supabaseAnonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase] MISSING env vars! Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env');
} else {
    console.log('[Supabase] Initialized for:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
