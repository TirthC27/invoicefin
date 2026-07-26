import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Helper to construct a consistent user object from session metadata
 * and optional backend profile data.
 */
function buildUserFromSession(session, backendData = null) {
  if (!session?.user) return null;
  const metadata = session.user.user_metadata || {};
  const rawRole = backendData?.role || metadata.role || 'INVESTOR';

  return {
    id: session.user.id,
    email: session.user.email,
    role: String(rawRole).toUpperCase(),
    status: backendData?.status || 'ACTIVE',
    full_name: backendData?.full_name || metadata.full_name || session.user.email?.split('@')[0],
    wallet_address: backendData?.wallet_address || null,
  };
}

/**
 * AuthProvider wraps the app and provides:
 * - session: Supabase session object
 * - user: { id, email, role, status, full_name, wallet_address }
 * - loading: true while checking auth state
 * - signOut: function to log out
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from backend (includes local AppUser role)
  const fetchUserProfile = useCallback(async (currentSession) => {
    if (!currentSession?.access_token) return;
    try {
      const resp = await fetch(`${API_BASE}/user/me/`, {
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      if (resp.ok) {
        const data = await resp.json();
        setUser(buildUserFromSession(currentSession, data));
      }
    } catch (err) {
      console.error('[Auth] Failed to fetch user profile:', err);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (mounted && currentSession) {
          setSession(currentSession);
          setUser(buildUserFromSession(currentSession));
          await fetchUserProfile(currentSession);
        }
      } catch (err) {
        console.error('[Auth] Init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        setSession(newSession);

        if (newSession) {
          setUser(buildUserFromSession(newSession));
          await fetchUserProfile(newSession);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }, []);

  /**
   * Get the role-based dashboard path for redirecting after login.
   */
  const getDashboardPath = useCallback(() => {
    if (!user) return '/dashboard';
    switch (user.role) {
      case 'INVESTOR': return '/investor/dashboard';
      case 'EXPORTER': return '/exporter/dashboard';
      case 'LAW_FIRM': return '/lawfirm/dashboard';
      case 'ADMIN': return '/admin/dashboard';
      default: return '/investor/dashboard';
    }
  }, [user]);

  const value = {
    session,
    user,
    loading,
    signOut,
    getDashboardPath,
    isAuthenticated: !!session,
    accessToken: session?.access_token || null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * ProtectedRoute — wraps a page component.
 * Redirects to /login if not authenticated.
 * Optionally restricts by role(s).
 */
export function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#0B0B0F', color: '#A0A0A8',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid rgba(124,92,252,0.2)',
            borderTopColor: '#7C5CFC', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <p>Loading...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#0B0B0F', color: '#EF4444',
        fontFamily: 'Inter, sans-serif', flexDirection: 'column', gap: 12,
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Access Denied</h1>
        <p style={{ color: '#A0A0A8' }}>You don't have permission to access this page.</p>
        <a href="/login" style={{ color: '#7C5CFC', textDecoration: 'underline' }}>
          Return to Login
        </a>
      </div>
    );
  }

  return children;
}

export default AuthContext;
