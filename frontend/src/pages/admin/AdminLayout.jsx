import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LayoutDashboard, Scale, Building2, Users } from 'lucide-react';
import AppShell from '../../components/AppShell';
import AppHeader from '../../components/AppHeader';
import AdminDashboard from './AdminDashboard';
import LawFirmsPage from './LawFirmsPage';
import RecoveryCasesPage from './RecoveryCasesPage';
import UsersPage from './UsersPage';

const NAV_ITEMS = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/recovery-cases', icon: Scale, label: 'Recovery Cases' },
  { to: '/admin/law-firms', icon: Building2, label: 'Law Firms' },
  { to: '/admin/users', icon: Users, label: 'Users' },
];

export default function AdminLayout() {
  return (
    <AppShell
      header={
        <AppHeader
          navItems={NAV_ITEMS}
          portalName="Admin Portal"
          accentColor="#c4b5fd"
        />
      }
    >
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="law-firms" element={<LawFirmsPage />} />
        <Route path="recovery-cases" element={<RecoveryCasesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}
