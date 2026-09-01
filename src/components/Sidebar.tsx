'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { hasActiveSubscription } from '@/lib/subscription/access';
import { LayoutDashboard, Users, FileText, CreditCard, ChevronLeft, ChevronRight, Settings, LogOut, ChevronDown, ScanSearch, Target, Bell, User, Shield, CheckCircle2, X, Menu, MessageSquare, BookOpen, BarChart3, Calendar, Link2 } from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/client-management', label: 'Clients', icon: Users },
      { href: '/client-pipeline', label: 'Leads', icon: Target },
    ],
  },
  {
    label: 'Credit Work',
    items: [
      { href: '/credit-report-import', label: 'Import Report', icon: ScanSearch },
      { href: '/credit-audit', label: 'Credit Audit', icon: BarChart3 },
      { href: '/disputes', label: 'Disputes', icon: Shield },
      { href: '/dispute-wizard', label: 'Dispute Wizard', icon: CheckCircle2 },
      { href: '/dispute-letter-management', label: 'Letters', icon: FileText },
    ],
  },
  {
    label: 'Guidance',
    items: [
      { href: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
    ],
  },
  {
    label: 'Business',
    items: [
      { href: '/billing-subscriptions', label: 'Billing', icon: CreditCard },
      { href: '/appointments', label: 'Appointments', icon: Calendar },
      { href: '/live-chat', label: 'Live Chat', icon: MessageSquare },
    ],
  },
  {
    label: 'Settings',
    items: [
      { href: '/settings/report-providers', label: 'Report Providers', icon: Link2 },
    ],
  },
];

const BILLING_ONLY_SECTIONS = [
  {
    label: 'Account',
    items: [
      { href: '/billing-subscriptions', label: 'Choose a Plan', icon: CreditCard },
    ],
  },
];

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  growth: 'Professional',
  agency: 'Agency',
  trial_active: 'Trial',
  trialing: 'Trial',
  active: 'Active',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  trial_active: 'bg-blue-100 text-blue-700',
  trialing: 'bg-blue-100 text-blue-700',
  past_due: 'bg-red-100 text-red-700',
  canceled: 'bg-slate-100 text-slate-600',
  inactive: 'bg-slate-100 text-slate-600',
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user } = useAuth();
  const supabase = createClient();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profile, setProfile] = useState<{
    full_name: string | null;
    email: string | null;
    subscription_status: string | null;
    subscription_plan: string | null;
    company_name: string | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setProfile(null);
    setProfileLoaded(false);
    if (!user) return () => { active = false; };
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('full_name, email, subscription_status, subscription_plan, company_name')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        if (active) setProfile(data);
      } catch (err) {
        console.error('[Sidebar] profile fetch error:', err);
      } finally {
        if (active) setProfileLoaded(true);
      }
    };
    fetchProfile();
    return () => { active = false; };
  }, [user]);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('[Sidebar] signOut error:', err);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      router.push('/sign-up-login-screen');
    }
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = profile?.email || user?.email || '';
  const displayCompany = profile?.company_name || user?.user_metadata?.company_name || 'My Company';
  const subStatus = profile?.subscription_status || 'inactive';
  const subPlan = profile?.subscription_plan || '';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const statusLabel = PLAN_LABELS[subPlan] || PLAN_LABELS[subStatus] || 'Free';
  const statusColor = STATUS_COLORS[subStatus] || STATUS_COLORS['inactive'];
  const hasWorkspaceAccess = profileLoaded && hasActiveSubscription(profile?.subscription_status);
  const visibleNavSections = hasWorkspaceAccess ? NAV_SECTIONS : BILLING_ONLY_SECTIONS;

  const SidebarContent = () => (
    <aside className={`relative flex h-full shrink-0 flex-col border-r border-border bg-card transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className={`flex items-center border-b border-border ${collapsed ? 'justify-center px-3 py-4' : 'px-4 py-4'}`}>
        {collapsed ? (
          <AppLogo size={32} />
        ) : (
          <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="FixMy.Money dashboard">
            <AppLogo size={34} />
            <span className="text-[17px] font-semibold tracking-[-.03em] text-[#101d3d]">
              FixMy<span className="text-[#3fa447]">.Money</span>
            </span>
          </Link>
        )}
      </div>

      {/* Subscription Status Badge */}
      {!collapsed && (
        <div className="px-4 py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${statusColor}`}>
              <CheckCircle2 size={10} />
              {profileLoaded ? `${statusLabel} Plan` : 'Checking plan…'}
            </span>
            {(subStatus === 'trial_active' || subStatus === 'trialing') && (
              <span className="text-xs text-slate-400">Trial active</span>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {!hasWorkspaceAccess && !collapsed && (
          <div className="mx-1 mb-4 rounded-xl border border-green-200 bg-green-50 p-3">
            <p className="text-sm font-bold text-slate-900">Unlock your workspace</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Choose a plan to access clients, reports, disputes, and letters.
            </p>
            <Link
              href="/billing-subscriptions"
              className="mt-3 flex min-h-9 items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-green-700"
            >
              View plans
            </Link>
          </div>
        )}
        {visibleNavSections.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-1.5">{section.label}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const ItemIcon = item.icon;
                const active = isActive(item.href);
                return (
                  <div key={`${item.href}-${item.label}`} className="relative group">
                    <Link
                      href={item.href}
                      className={`flex min-h-10 items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                        active
                          ? 'bg-green-50 text-green-800 ring-1 ring-inset ring-green-200'
                          : (item as any).ai
                            ? 'text-violet-600 hover:bg-violet-50 hover:text-violet-700'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      } ${collapsed ? 'justify-center px-0 py-2.5' : ''}`}
                    >
                      <ItemIcon size={17} className="shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {(item as any).badge && (
                            <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                              {(item as any).badge}
                            </span>
                          )}
                          {(item as any).ai && !active && (
                            <span className="text-xs font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full">AI</span>
                          )}
                        </>
                      )}
                    </Link>
                    {collapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                        {item.label}
                        {(item as any).badge && (
                          <span className="ml-1 bg-red-500 text-white text-xs px-1 rounded-full">{(item as any).badge}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile + Logout */}
      <div className="border-t border-border p-2">
        {/* Settings */}
        <div className="relative group mb-0.5">
          <Link
            href="/workspace-setup"
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full ${collapsed ? 'justify-center px-0 py-2.5' : ''}`}
          >
            <Settings size={17} className="shrink-0" />
            {!collapsed && <span className="flex-1 text-left">Settings</span>}
          </Link>
          {collapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              Settings
            </div>
          )}
        </div>

        {/* Notifications */}
        {hasWorkspaceAccess && (
          <div className="relative group mb-0.5">
            <Link href="/notifications" className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full ${collapsed ? 'justify-center px-0 py-2.5' : ''}`}>
              <Bell size={17} className="shrink-0" />
              {!collapsed && <span className="flex-1 text-left">Notifications</span>}
            </Link>
            {collapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Notifications
              </div>
            )}
          </div>
        )}

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted transition-colors w-full ${collapsed ? 'justify-center px-0 py-2.5' : ''}`}
          >
            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-slate-100">
              {initials}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                </div>
                <ChevronDown size={13} className={`text-slate-400 shrink-0 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>

          {profileOpen && !collapsed && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{displayCompany}</p>
              </div>
              <div className="py-1">
                <Link href="/workspace-setup" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                  <User size={15} className="text-slate-400" />
                  Profile & Settings
                </Link>
                <Link href="/billing-subscriptions" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                  <CreditCard size={15} className="text-slate-400" />
                  Billing & Plans
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full">
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
      className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:bg-muted transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={12} className="text-slate-500" /> : <ChevronLeft size={12} className="text-slate-500" />}
      </button>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-screen sticky top-0">
        <SidebarContent />
      </div>

      {/* Mobile Toggle */}
      <button
        aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
        className="md:hidden fixed top-4 left-4 z-50 w-11 h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={18} className="text-slate-600" /> : <Menu size={18} className="text-slate-600" />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-64 shadow-2xl">
            <SidebarContent />
          </div>
        </>
      )}
    </>
  );
}
