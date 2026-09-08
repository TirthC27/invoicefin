import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LayoutDashboard, Upload, FileText } from 'lucide-react';
import AppShell from '../../components/AppShell';
import AppHeader from '../../components/AppHeader';
import ExporterDashboard from './ExporterDashboard';
import UploadInvoice from './UploadInvoice';
import InvoicesPage from './InvoicesPage';
import InvoiceDetailPage from './InvoiceDetailPage';

const NAV_ITEMS = [
  { to: '/exporter/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/exporter/upload', icon: Upload, label: 'Upload Invoice' },
  { to: '/exporter/invoices', icon: FileText, label: 'All Invoices' },
];

export default function ExporterLayout() {
  return (
    <AppShell
      header={
        <AppHeader
          navItems={NAV_ITEMS}
          portalName="Exporter Portal"
          accentColor="#fde68a"
        />
      }
    >
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ExporterDashboard />} />
        <Route path="upload" element={<UploadInvoice />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="invoice/:id" element={<InvoiceDetailPage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}
