import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, TrendingUp, Shield,
  FileCheck, Upload, FileText
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useWallet } from '../../context/useWallet';
import AppShell from '../../components/AppShell';
import AppHeader from '../../components/AppHeader';
import InvestorDashboard from './InvestorDashboard';
import PoolsPage from './PoolsPage';
import PoolDetailPage from './PoolDetailPage';
import PortfolioPage from './PortfolioPage';
import RecoveryViewPage from './RecoveryViewPage';
import KYCPage from './KYCPage';
import ExporterDashboard from '../exporter/ExporterDashboard';
import UploadInvoice from '../exporter/UploadInvoice';
import InvoicesPage from '../exporter/InvoicesPage';
import InvoiceDetailPage from '../exporter/InvoiceDetailPage';

const INVESTOR_NAV = [
  { to: '/investor/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/investor/pools', icon: Briefcase, label: 'Invest' },
  { to: '/investor/portfolio', icon: TrendingUp, label: 'Portfolio' },
  { to: '/investor/recovery', icon: Shield, label: 'Recovery' },
];

const EXPORTER_NAV = [
  { to: '/investor/exporter/dashboard', icon: LayoutDashboard, label: 'Exporter' },
  { to: '/investor/exporter/upload', icon: Upload, label: 'Upload' },
  { to: '/investor/exporter/invoices', icon: FileText, label: 'Invoices' },
];

export default function InvestorLayout() {
  const { user } = useAuth();
  const wallet = useWallet();

  const isExporter = user?.can_export || user?.role === 'EXPORTER';
  const canBeExporter = !user?.can_export && user?.role !== 'EXPORTER';

  const navItems = [
    ...INVESTOR_NAV,
    ...(canBeExporter ? [{ to: '/investor/kyc', icon: FileCheck, label: 'Become Exporter' }] : []),
    ...(isExporter ? EXPORTER_NAV : []),
  ];

  // Wallet connect button content injected into header via portal pattern
  const walletLabel = wallet?.isConnected
    ? `🔗 ${wallet.truncatedAddress}`
    : '+ Connect Wallet';

  return (
    <AppShell
      header={
        <AppHeader
          navItems={navItems}
          portalName="Investor Portal"
          accentColor="#ffffff"
          rightExtra={
            <button
              className="app-header-wallet-btn"
              onClick={wallet?.isConnected ? wallet?.disconnectWallet : wallet?.connectWallet}
            >
              {walletLabel}
            </button>
          }
        />
      }
    >
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<InvestorDashboard />} />
        <Route path="pools" element={<PoolsPage />} />
        <Route path="pools/:id" element={<PoolDetailPage />} />
        <Route path="portfolio" element={<PortfolioPage />} />
        <Route path="recovery" element={<RecoveryViewPage />} />
        <Route path="kyc" element={<KYCPage />} />
        <Route path="exporter/dashboard" element={<ExporterDashboard />} />
        <Route path="exporter/upload" element={<UploadInvoice />} />
        <Route path="exporter/invoices" element={<InvoicesPage />} />
        <Route path="exporter/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="exporter/invoice/:id" element={<InvoiceDetailPage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}
