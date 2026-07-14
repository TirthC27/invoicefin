import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    '';

let client;

// Check if we are running in placeholder/mock mode
const isPlaceholder = !supabaseUrl || supabaseUrl.includes('placeholder');

if (isPlaceholder) {
  console.log('[Supabase] Operating in local MOCK/PREVIEW mode.');
  
  client = {
    auth: {
      getSession: async () => {
        const mockSession = localStorage.getItem('invoicefi_mock_session');
        if (mockSession) {
          return { data: { session: JSON.parse(mockSession) }, error: null };
        }
        return { data: { session: null }, error: null };
      },
      signInWithPassword: async ({ email, password }) => {
        const user = { id: 'mock-user-id', email };
        const session = { access_token: 'mock-token', user };
        localStorage.setItem('invoicefi_mock_session', JSON.stringify(session));
        return { data: { user, session }, error: null };
      },
      signUp: async ({ email, password }) => {
        const user = { id: 'mock-user-id', email };
        const session = { access_token: 'mock-token', user };
        localStorage.setItem('invoicefi_mock_session', JSON.stringify(session));
        return { data: { user, session }, error: null };
      },
      signInWithOAuth: async (config) => {
        const user = { id: 'mock-user-id', email: 'oauth-user@gmail.com' };
        const session = { access_token: 'mock-token', user };
        localStorage.setItem('invoicefi_mock_session', JSON.stringify(session));
        // Simulate redirect logic on frontend
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 100);
        return { data: { user, session }, error: null };
      },
      signOut: async () => {
        localStorage.removeItem('invoicefi_mock_session');
        return { error: null };
      }
    },
    from: (table) => {
      return {
        select: () => {
          return {
            order: () => {
              return Promise.resolve({ data: [], error: null });
            },
            then: (resolve) => resolve({ data: [], error: null })
          };
        },
        upsert: () => {
          return {
            then: (resolve) => resolve({ data: null, error: null })
          };
        },
        insert: () => {
          return {
            then: (resolve) => resolve({ data: null, error: null })
          };
        }
      };
    }
  };
} else {
  console.log('[Supabase] Initialized for production cloud:', supabaseUrl);
  client = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = client;
export default supabase;
