import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

export default function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        console.log('[Signup] Attempting signup for:', email);

        try {
            // 1. Sign up via Supabase Auth
            const { data, error: signupError } = await supabase.auth.signUp({ email, password });

            console.log('[Signup] Supabase response:', { data, signupError });

            if (signupError) throw signupError;

            if (data?.user) {
                // 2. Upsert profile row
                const { error: profileError } = await supabase.from('profiles').upsert({
                    id: data.user.id,
                    email: data.user.email,
                    full_name: fullName,
                    role: 'investor',
                }, { onConflict: 'id' });

                if (profileError) {
                    console.warn('[Signup] Profile upsert error (non-fatal):', profileError.message);
                }

                if (data?.session) {
                    navigate('/dashboard');
                } else {
                    setSuccess('Account created! Check your email to confirm, then login.');
                }
            }
        } catch (err) {
            console.error('[Signup] Error:', err);
            setError(err.message || 'An error occurred during signup');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '0.6rem 0.75rem',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        fontSize: '0.95rem',
        boxSizing: 'border-box',
        outline: 'none',
        fontFamily: 'inherit',
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
            <div style={{ maxWidth: 440, width: '100%', padding: '2rem', background: '#fff', borderRadius: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.08)' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center', color: '#111' }}>
                    Create Investor Account
                </h2>

                {error && (
                    <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                )}
                {success && (
                    <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>
                        {success}
                    </div>
                )}

                <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: '#374151' }}>
                            Full Name
                        </label>
                        <input
                            id="fullName"
                            type="text"
                            required
                            style={inputStyle}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="John Doe"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: '#374151' }}>
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            style={inputStyle}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: '#374151' }}>
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            required
                            minLength={6}
                            style={inputStyle}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Minimum 6 characters"
                        />
                    </div>

                    <button
                        id="signup-btn"
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: '0.5rem',
                            width: '100%',
                            background: loading ? '#93c5fd' : '#2563eb',
                            color: '#fff',
                            fontWeight: 600,
                            padding: '0.65rem',
                            borderRadius: 8,
                            border: 'none',
                            fontSize: '0.95rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'background 0.2s',
                        }}
                    >
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: '#2563eb', fontWeight: 500, textDecoration: 'none' }}>
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
}
