import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base, #f5f4f0)',
      color: 'var(--fg-primary, #1a1a1f)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <main style={{ maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontSize: 72, fontWeight: 900, letterSpacing: -4, marginBottom: 12, color: 'var(--color-accent-strong, #5b7a5b)', opacity: 0.4 }}>
          404
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 12px', letterSpacing: -0.5 }}>Page not found</h1>
        <p style={{ color: 'var(--fg-muted, #888)', fontSize: 14, lineHeight: 1.6, margin: '0 0 28px' }}>
          The page you opened does not exist in this InvoiceFi workspace.
        </p>
        <Link to="/dashboard" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          Go to dashboard
        </Link>
      </main>
    </div>
  );
}