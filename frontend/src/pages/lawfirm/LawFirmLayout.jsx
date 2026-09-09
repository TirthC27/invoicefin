import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LayoutDashboard, Scale, Handshake } from 'lucide-react';
import AppShell from '../../components/AppShell';
import AppHeader from '../../components/AppHeader';
import LawFirmDashboard from './LawFirmDashboard';
import AssignedCasesPage from './AssignedCasesPage';
import CaseDetailPage from './CaseDetailPage';
import RecoveryMarketplacePage from './RecoveryMarketplacePage';

const NAV_ITEMS = [
  { to: '/lawfirm/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/lawfirm/marketplace', icon: Scale, label: 'Bid Marketplace' },
  { to: '/lawfirm/cases', icon: Handshake, label: 'Assigned Cases' },
];

export default function LawFirmLayout() {
  return (
    <AppShell
      header={
        <AppHeader
          navItems={NAV_ITEMS}
          portalName="Law Firm Portal"
          accentColor="#ffffff"
        />
      }
    >
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<LawFirmDashboard />} />
        <Route path="marketplace" element={<RecoveryMarketplacePage />} />
        <Route path="cases" element={<AssignedCasesPage />} />
        <Route path="cases/:id" element={<CaseDetailPage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}
