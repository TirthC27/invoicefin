import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import Signup from './pages/Signup';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

// New role-based pages
import AdminLayout from './pages/admin/AdminLayout';
import LawFirmLayout from './pages/lawfirm/LawFirmLayout';
import ExporterLayout from './pages/exporter/ExporterLayout';
import InvestorLayout from './pages/investor/InvestorLayout';

import './index.css';

/**
 * RoleRedirect — reads user role and redirects to the correct dashboard.
 * This preserves backward compatibility: existing /dashboard URLs still work.
 */
function RoleRedirect() {
  const { user, session, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#0B0B0F', color: '#A0A0A8',
      }}>
        <p>Redirecting...</p>
      </div>
    );
  }

  if (!user && !session) return <Navigate to="/login" replace />;

  const role = (user?.role || 'INVESTOR').toUpperCase();

  switch (role) {
    case 'ADMIN': return <Navigate to="/admin/dashboard" replace />;
    case 'LAW_FIRM': return <Navigate to="/lawfirm/dashboard" replace />;
    case 'EXPORTER': return <Navigate to="/exporter/dashboard" replace />;
    case 'INVESTOR':
    default:
      return <Navigate to="/investor/dashboard" replace />;
  }
}

function App() {
  return (
    <Router>
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/" element={<Login />} />
        <Route path="/auth" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        {/* ── Role redirect (backward compat) ── */}
        <Route path="/dashboard" element={<RoleRedirect />} />

        {/* ── Investor portal ── */}
        <Route path="/investor/*" element={
          <ProtectedRoute allowedRoles={['INVESTOR']}>
            <InvestorLayout />
          </ProtectedRoute>
        } />

        {/* ── Admin portal ── */}
        <Route path="/admin/*" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminLayout />
          </ProtectedRoute>
        } />

        {/* ── Law Firm portal ── */}
        <Route path="/lawfirm/*" element={
          <ProtectedRoute allowedRoles={['LAW_FIRM']}>
            <LawFirmLayout />
          </ProtectedRoute>
        } />

        {/* ── Exporter portal ── */}
        <Route path="/exporter/*" element={
          <ProtectedRoute allowedRoles={['EXPORTER']}>
            <ExporterLayout />
          </ProtectedRoute>
        } />

        {/* Application-level 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
