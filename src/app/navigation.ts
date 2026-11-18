import {
  Activity, BarChart3, Building2, CreditCard, FileText, LayoutDashboard,
  Receipt, Settings2, Wallet,
} from 'lucide-react';

export type BusinessSection =
  | 'overview'
  | 'tenants'
  | 'subscriptions'
  | 'payments'
  | 'expenses'
  | 'reports'
  | 'audit'
  | 'settings';

export const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Workspace' },
  { id: 'tenants', label: 'Tenants', icon: Building2, group: 'Workspace' },
  { id: 'subscriptions', label: 'Subscriptions', icon: Receipt, group: 'Workspace' },
  { id: 'payments', label: 'Payments', icon: CreditCard, group: 'Finance' },
  { id: 'expenses', label: 'Expenses', icon: Wallet, group: 'Finance' },
  { id: 'reports', label: 'Reports', icon: BarChart3, group: 'Finance' },
  { id: 'audit', label: 'Activity log', icon: Activity, group: 'Administration' },
  { id: 'settings', label: 'Settings', icon: Settings2, group: 'Administration' },
] as const;

export const sectionMeta: Record<BusinessSection, { title: string; description: string }> = {
  overview: { title: 'Business overview', description: 'A clear view of Web2Table’s business performance.' },
  tenants: { title: 'Tenants', description: 'Restaurant accounts and branch relationships.' },
  subscriptions: { title: 'Subscriptions', description: 'Subscription status, billing cycles, and plan oversight.' },
  payments: { title: 'Payments', description: 'Collections, payment attempts, and reconciliation.' },
  expenses: { title: 'Expenses', description: 'Track Web2Table company operating expenses.' },
  reports: { title: 'Financial reports', description: 'Review collections, recurring revenue, and expenses.' },
  audit: { title: 'Activity log', description: 'Trace sensitive business actions and changes.' },
  settings: { title: 'Business settings', description: 'Internal workspace configuration and access.' },
};