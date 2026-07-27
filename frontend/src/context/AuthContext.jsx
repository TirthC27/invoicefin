import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { AuthContext } from './authContextValue';
import { useAuth } from './useAuth';

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
  const [backendAuthError, setBackendAuthError] = useState(null);

  /**
   * Fetch user profile from backend Django API.
   * - Sets a Supabase-based fallback user FIRST so the app is never blocked.
   * - Enriches with backend data (role, status, wallet) on success.
   * - On genuine 401/403: token is invalid → clear user + surface error.
   * - On network error / 5xx: keep fallback user, log warning (don't block login).
   */
  const fetchUserProfile = useCallback(async (currentSession) => {
    if (!currentSession?.access_token || !currentSession?.user) return null;

    // Immediately set a Supabase-based user so ProtectedRoute never blocks
    // on a valid session while the backend call is in flight.
    const fallbackUser = buildUserFromSession(currentSession, null);
    setUser(fallbackUser);
    setBackendAuthError(null);

    try {
      const resp = await fetch(`${API_BASE}/user/me/`, {
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (resp.ok) {
        const text = await resp.text();
        const data = text ? JSON.parse(text) : {};
        const enrichedUser = buildUserFromSession(currentSession, data);
        setUser(enrichedUser);
        setBackendAuthError(null);
        return enrichedUser;
      }

      if (resp.status === 401 || resp.status === 403) {
        // Genuine auth failure: token is invalid/expired on the backend.
        let data = {};
        try { data = await resp.json(); } catch { /* ignore */ }
        const errMsg = data?.error || data?.detail || 'Your session is not authorized. Please sign in again.';
        console.warn('[Auth] Backend auth rejected:', errMsg);
        setUser(null);
        setBackendAuthError(errMsg);
        return null;
      }

      // 5xx or unexpected: keep the fallback user, warn in console.
      console.warn('[Auth] Backend /user/me/ returned', resp.status, '— using Supabase session as fallback');
      return fallbackUser;

    } catch (err) {
      // Network error (backend offline, CORS, etc.): keep fallback user.
      console.warn('[Auth] Could not reach backend /user/me/ — using Supabase session as fallback:', err.message);
      return fallbackUser;
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
          await fetchUserProfile(currentSession);
        } else if (mounted) {
          setBackendAuthError(null);
        }
      } catch (err) {
        console.error('[Auth] Init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes (fires on sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        setSession(newSession);

        if (newSession) {
          await fetchUserProfile(newSession);
        } else {
          setUser(null);
          setBackendAuthError(null);
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
    setBackendAuthError(null);
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
    backendAuthError,
    backendReady: !!session && !!user && !backendAuthError,
    isAuthenticated: !!session && !!user,
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
  const { isAuthenticated, user, loading, backendAuthError } = useAuth();

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
    return <Navigate to="/login" replace state={backendAuthError ? { authError: backendAuthError } : undefined} />;
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

