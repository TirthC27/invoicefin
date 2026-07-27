import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B0B0F',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <main style={{ maxWidth: 420, textAlign: 'center' }}>
        <div style={{ color: '#A0A0A8', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>404</div>
        <h1 style={{ fontSize: 32, lineHeight: 1.1, margin: '0 0 12px' }}>Page not found</h1>
        <p style={{ color: '#A0A0A8', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
          The page you opened does not exist in this InvoiceFi workspace.
        </p>
        <Link
          to="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 40,
            padding: '0 16px',
            borderRadius: 8,
            background: '#7C5CFC',
            color: '#fff',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          Go to dashboard
        </Link>
      </main>
    </div>
  );
}