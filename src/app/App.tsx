import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowDownRight, ArrowUpRight, Bell, ChevronDown, CircleHelp, Command,
  CreditCard, Download, ExternalLink, Menu, Plus, Search, ShieldCheck,
  TrendingUp, Wallet, X,
} from 'lucide-react';
import { navigation, sectionMeta, type BusinessSection } from './navigation';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type AuthStatus = 'loading' | 'signed-out' | 'authorized' | 'denied' | 'unconfigured';

function hasBusinessOwnerAccess(user: { app_metadata?: Record<string, unknown> }) {
  return user.app_metadata?.business_access === true &&
    user.app_metadata?.business_role === 'owner';
}

function LoginScreen({ denied = false }: { denied?: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(denied ? 'This account is not authorized to access Web2Table Business.' : '');
  const [notice, setNotice] = useState('');

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(''); setNotice('');
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError || !data.user) {
      setError(signInError?.message ?? 'Unable to sign in. Please try again.');
      setBusy(false); return;
    }
    const { data: verified, error: verifyError } = await supabase.auth.getUser();
    if (verifyError || !verified.user || !hasBusinessOwnerAccess(verified.user)) {
      await supabase.auth.signOut();
      setError('Access denied. This account has not been granted Web2Table Business Owner access.');
    }
    setBusy(false);
  };

  const resetPassword = async () => {
    if (!supabase || !email.trim()) {
      setError('Enter your account email first, then choose Forgot password.');
      return;
    }
    setBusy(true); setError(''); setNotice('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    if (resetError) setError(resetError.message);
    else setNotice('If this email belongs to an account, a password reset link has been sent.');
    setBusy(false);
  };

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-brand"><img src="https://raw.githubusercontent.com/web2table/Web2Table-Billing/main/web2table1.png" alt="Web2Table" /><div><strong>web2table</strong><span>BUSINESS</span></div></div>
        <div className="auth-eyebrow">PRIVATE WORKSPACE</div>
        <h1>Welcome back</h1>
        <p className="auth-intro">Sign in with your authorized Web2Table Business account.</p>
        {error && <div className="auth-message auth-error" role="alert">{error}</div>}
        {notice && <div className="auth-message auth-success" role="status">{notice}</div>}
        <form onSubmit={signIn}>
          <label htmlFor="business-email">Work email</label>
          <input id="business-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@web2table.io" />
          <label htmlFor="business-password">Password</label>
          <input id="business-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'}</button>
        </form>
        <button className="auth-forgot" type="button" disabled={busy} onClick={resetPassword}>Forgot password?</button>
        <div className="auth-footnote"><ShieldCheck size={15} /> Access is restricted to explicitly authorized Business Owners.</div>
      </section>
      <div className="auth-copyright">© 2026 Web2Table · Internal use only</div>
    </main>
  );
}

export function App() {
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'unconfigured');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let alive = true;
    const verifySession = async () => {
      const { data: sessionData } = await client.auth.getSession();
      if (!alive) return;
      if (!sessionData.session) { setStatus('signed-out'); setEmail(''); return; }
      const { data, error } = await client.auth.getUser();
      if (!alive) return;
      if (!error && data.user && hasBusinessOwnerAccess(data.user)) {
        setEmail(data.user.email ?? 'Business Owner');
        setStatus('authorized');
      } else {
        await client.auth.signOut();
        if (alive) { setEmail(''); setStatus('denied'); }
      }
    };
    void verifySession();
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (alive) { setEmail(''); setStatus('signed-out'); }
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        queueMicrotask(() => { void client.auth.getUser().then(({ data, error }) => {
          if (!alive) return;
          if (!error && data.user && hasBusinessOwnerAccess(data.user)) {
            setEmail(data.user.email ?? 'Business Owner'); setStatus('authorized');
          } else {
            void client.auth.signOut();
            setEmail(''); setStatus('denied');
          }
        }); });
      }
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setEmail(''); setStatus('signed-out');
  };

  if (status === 'loading') return <main className="auth-screen"><div className="auth-loading">Checking secure session…</div></main>;
  if (status === 'unconfigured') return <main className="auth-screen"><section className="auth-card"><h1>Business login unavailable</h1><p className="auth-intro">The Supabase URL and publishable key are not configured for this deployment.</p></section></main>;
  if (status !== 'authorized') return <LoginScreen key={status} denied={status === 'denied'} />;
  return <BusinessWorkspace onSignOut={signOut} email={email} />;
}

function MetricCard({ label, value, note, icon: Icon }: {
  label: string; value: string; note: string; icon: typeof Wallet;
}) {
  return (
    <article className="metric-card">
      <div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={17} /></span></div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">{note}</div>
    </article>
  );
}

function EmptyModule({ section }: { section: BusinessSection }) {
  const meta = sectionMeta[section];
  return (
    <div className="module-empty">
      <div className="empty-symbol"><ShieldCheck size={24} /></div>
      <h3>{meta.title} module is ready for integration</h3>
      <p>{meta.description} Connect the approved Web2Table data source before displaying live records or enabling financial actions.</p>
      <span className="status-pill"><span /> Awaiting data integration</span>
    </div>
  );
}

function BusinessWorkspace({ onSignOut, email }: { onSignOut: () => void; email: string }) {
  const [active, setActive] = useState<BusinessSection>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const meta = sectionMeta[active];

  const chooseSection = (section: BusinessSection) => {
    setActive(section);
    setMobileOpen(false);
  };

  return (
    <div className="app-shell">
      {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><img src="https://raw.githubusercontent.com/web2table/Web2Table-Billing/main/web2table1.png" alt="Web2Table logo" /></div>
          <div><strong>web2table</strong><span>BUSINESS</span></div>
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="workspace-switch"><div className="workspace-avatar"><img src="https://raw.githubusercontent.com/web2table/Web2Table-Billing/main/web2table1.png" alt="" /></div><div><strong>Web2Table Inc.</strong><span>Business workspace</span></div><ChevronDown size={15} /></div>
        <nav className="side-nav" aria-label="Business navigation">
          {(['Workspace', 'Finance', 'Administration'] as const).map(group => (
            <div className="nav-group" key={group}>
              <div className="nav-label">{group}</div>
              {navigation.filter(item => item.group === group).map(item => {
                const Icon = item.icon;
                return <button key={item.id} className={`nav-item ${active === item.id ? 'active' : ''}`} onClick={() => chooseSection(item.id)}>
                  <Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>
                  {item.id === 'payments' && <span className="nav-dot" />}
                </button>;
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon"><CircleHelp size={17} /></div><strong>Need a hand?</strong><p>Business workspace guide and support.</p><a href="mailto:support@web2table.io">Contact support <ExternalLink size={12} /></a></div>
          <div className="profile-row"><div className="profile-avatar"><img src="https://raw.githubusercontent.com/web2table/Web2Table-Billing/main/web2table1.png" alt="" /></div><div><strong>{email}</strong><span>Business Owner</span></div><button className="icon-button" onClick={onSignOut} aria-label="Sign out" title="Sign out"><ChevronDown size={16} /></button></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button><div className="breadcrumb">Web2Table <span>/</span> <strong>{meta.title}</strong></div></div>
          <div className="topbar-actions"><div className="environment-chip"><span /> Internal workspace</div><button className="icon-button" aria-label="Search"><Search size={18} /></button><button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /></button><div className="topbar-divider" /><div className="topbar-user"><img src="https://raw.githubusercontent.com/web2table/Web2Table-Billing/main/web2table1.png" alt="Web2Table" /></div></div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><div className="eyebrow">WEB2TABLE BUSINESS</div><h1>{meta.title}</h1><p>{meta.description}</p></div>
            <div className="heading-actions"><button className="button-secondary"><Download size={15} /> Export</button><button className="button-primary" onClick={() => chooseSection('subscriptions')}><Plus size={16} /> View subscriptions</button></div>
          </div>

          {!isSupabaseConfigured && <div className="connection-banner"><div className="connection-icon"><Command size={17} /></div><div><strong>Data connection not configured</strong><span>Add the public Supabase URL and publishable key to the deployment environment. No live financial figures are being shown.</span></div></div>}

          {active === 'overview' ? (
            <>
              <div className="section-title-row"><div><h2>Performance snapshot</h2><p>Live figures will appear after the trusted data integration is connected.</p></div><button className="period-button">All time <ChevronDown size={14} /></button></div>
              <div className="metrics-grid">
                <MetricCard label="Monthly recurring revenue" value="—" note="Awaiting subscription data" icon={TrendingUp} />
                <MetricCard label="Collected this month" value="—" note="Awaiting verified payments" icon={CreditCard} />
                <MetricCard label="Active subscriptions" value="—" note="Awaiting subscription data" icon={ShieldCheck} />
                <MetricCard label="Operating expenses" value="—" note="Awaiting expense records" icon={Wallet} />
              </div>
              <div className="overview-grid">
                <section className="panel revenue-panel"><div className="panel-heading"><div><h2>Revenue overview</h2><p>Collected payments over time</p></div><span className="panel-menu">•••</span></div><div className="chart-placeholder"><div className="chart-grid"><i /><i /><i /><i /></div><div className="chart-empty"><div className="chart-icon"><TrendingUp size={22} /></div><strong>No revenue data yet</strong><span>Connect verified payment records to see your revenue trend.</span></div><div className="chart-months"><span>JAN</span><span>FEB</span><span>MAR</span><span>APR</span><span>MAY</span><span>JUN</span><span>JUL</span><span>AUG</span><span>SEP</span><span>OCT</span><span>NOV</span><span>DEC</span></div></div></section>
                <section className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Latest business events</p></div><button className="text-action" onClick={() => chooseSection('audit')}>View log</button></div><div className="activity-empty"><div className="activity-icon"><ActivityIcon /></div><strong>No activity to display</strong><span>Verified business events will appear here.</span></div></section>
              </div>
              <div className="bottom-grid">
                <section className="panel"><div className="panel-heading"><div><h2>Subscription health</h2><p>Current tenant subscription status</p></div><button className="text-action" onClick={() => chooseSection('subscriptions')}>View all</button></div><div className="list-empty">Subscription records will appear when connected.</div></section>
                <section className="panel"><div className="panel-heading"><div><h2>Payment collection</h2><p>Recent verified collections</p></div><button className="text-action" onClick={() => chooseSection('payments')}>View all</button></div><div className="list-empty">Verified PayMongo payments will appear here.</div></section>
              </div>
            </>
          ) : <section className="panel module-panel"><EmptyModule section={active} /></section>}

          <footer className="page-footer"><span>© 2026 Web2Table Business</span><span>PHP · Asia/Manila</span><span>Internal use only</span></footer>
        </div>
      </main>
    </div>
  );
}

function ActivityIcon() {
  return <ArrowUpRight size={20} />;
}
