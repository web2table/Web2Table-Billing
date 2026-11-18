import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowDownRight, ArrowUpRight, Bell, ChevronDown, CircleHelp, Command,
  CreditCard, Download, ExternalLink, Menu, Plus, Search, ShieldCheck,
  TrendingUp, Wallet, X,
} from 'lucide-react';
import { navigation, sectionMeta, type BusinessSection } from './navigation';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type AuthStatus = 'loading' | 'signed-out' | 'authorized' | 'mfa-enroll' | 'mfa-challenge' | 'denied' | 'unconfigured';

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
        <div className="auth-brand"><img src="https://raw.githubusercontent.com/web2table/Web2Table-Billing/main/web2table1.png" alt="Web2Table" /><div><strong>Web2Table</strong><span>BUSINESS</span></div></div>
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


function MFASetupScreen({ onComplete }: { onComplete: () => void }) {
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const setup = async () => {
      if (!supabase) return;
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) { if (alive) setError(listError.message); return; }
      const pending = factors.all.filter(f => f.factor_type === 'totp' && f.status !== 'verified');
      for (const factor of pending) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Web2Table Business authenticator',
      });
      if (!alive) return;
      if (enrollError) { setError(enrollError.message); return; }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    };
    void setup();
    return () => { alive = false; };
  }, []);

  const enable = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !factorId) return;
    setBusy(true); setError('');
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) { setError(challengeError.message); setBusy(false); return; }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId, challengeId: challenge.id, code: code.replace(/\\s/g, ''),
    });
    if (verifyError) { setError(verifyError.message); setBusy(false); return; }
    const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance.currentLevel !== 'aal2') {
      setError(assuranceError?.message ?? 'Two-factor verification did not reach the required security level. Please try again.');
      setBusy(false);
      return;
    }
    onComplete();
    setBusy(false);
  };

  return <main className="auth-screen"><section className="auth-card">
    <div className="auth-brand"><img src="https://raw.githubusercontent.com/web2table/Web2Table-Billing/main/web2table1.png" alt="Web2Table" /><div><strong>Web2Table</strong><span>BUSINESS</span></div></div>
    <div className="auth-eyebrow">REQUIRED ACCOUNT SECURITY</div><h1>Set up two-factor authentication</h1>
    <p className="auth-intro">Protect your Business Owner account with an authenticator app such as Google Authenticator, Microsoft Authenticator, or 1Password. Scan this QR code, then enter the 6-digit code from your app.</p>
    {error && <div className="auth-message auth-error" role="alert">{error}</div>}
    {qrCode ? <div className="mfa-qr-wrap"><img className="mfa-qr" src={qrCode} alt="Authenticator setup QR code" /></div> : <div className="auth-loading">Preparing your secure authenticator setup…</div>}
    {secret && <div className="mfa-secret"><span>Can't scan? Enter this setup key manually</span><code>{secret}</code></div>}
    <form onSubmit={enable}><label htmlFor="mfa-enroll-code">6-digit authenticator code</label><input id="mfa-enroll-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,8}" maxLength={8} required value={code} onChange={e => setCode(e.target.value.replace(/[^0-9 ]/g, ''))} placeholder="000000" /><button className="auth-submit" type="submit" disabled={busy || !factorId}>{busy ? 'Verifying…' : 'Enable two-factor authentication'}</button></form>
    <div className="auth-footnote"><ShieldCheck size={15} /> MFA is required before accessing financial and business records.</div>
  </section><div className="auth-copyright">© 2026 Web2Table · Internal use only</div></main>;
}

function MFAChallengeScreen({ onComplete }: { onComplete: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError('');
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) { setError(listError.message); setBusy(false); return; }
    const factor = factors.totp.find(f => f.status === 'verified');
    if (!factor) { setError('No verified authenticator is available. Sign in again to set one up.'); setBusy(false); return; }
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (challengeError) { setError(challengeError.message); setBusy(false); return; }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code: code.replace(/\\s/g, '') });
    if (verifyError) {
      setError(verifyError.message);
      setBusy(false);
      return;
    }
    const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance.currentLevel !== 'aal2') {
      setError(assuranceError?.message ?? 'Two-factor verification did not reach the required security level. Please try again.');
      setBusy(false);
      return;
    }
    onComplete();
    setBusy(false);
  };
  return <main className="auth-screen"><section className="auth-card">
    <div className="auth-brand"><img src="https://raw.githubusercontent.com/web2table/Web2Table-Billing/main/web2table1.png" alt="Web2Table" /><div><strong>Web2Table</strong><span>BUSINESS</span></div></div>
    <div className="auth-eyebrow">SECOND VERIFICATION STEP</div><h1>Verify it's you</h1>
    <p className="auth-intro">Enter the 6-digit code from your authenticator app to continue to Web2Table Business.</p>
    {error && <div className="auth-message auth-error" role="alert">{error}</div>}
    <form onSubmit={verify}><label htmlFor="mfa-login-code">Authenticator code</label><input id="mfa-login-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,8}" maxLength={8} required value={code} onChange={e => setCode(e.target.value.replace(/[^0-9 ]/g, ''))} placeholder="000000" /><button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Verifying…' : 'Verify and continue'}</button></form>
    <div className="auth-footnote"><ShieldCheck size={15} /> Your authenticator code changes periodically. Never share it with anyone.</div>
  </section><div className="auth-copyright">© 2026 Web2Table · Internal use only</div></main>;
}

export function App() {
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'unconfigured');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let alive = true;

    const resolveAccess = async () => {
      const { data, error } = await client.auth.getUser();
      if (!alive) return;
      if (error || !data.user || !hasBusinessOwnerAccess(data.user)) {
        await client.auth.signOut();
        if (alive) { setEmail(''); setStatus('denied'); }
        return;
      }

      setEmail(data.user.email ?? 'Business Owner');
      const { data: factors, error: factorsError } = await client.auth.mfa.listFactors();
      if (!alive) return;
      if (factorsError) {
        setEmail(''); setStatus('denied');
        return;
      }

      const verifiedTotp = factors.totp.some(factor => factor.status === 'verified');
      if (!verifiedTotp) {
        setStatus('mfa-enroll');
        return;
      }

      const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!alive) return;
      if (assuranceError) {
        setEmail(''); setStatus('denied');
        return;
      }
      setStatus(assurance.currentLevel === 'aal2' ? 'authorized' : 'mfa-challenge');
    };

    const verifySession = async () => {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (!alive) return;
      if (sessionError || !sessionData.session) {
        setStatus('signed-out'); setEmail(''); return;
      }
      await resolveAccess();
    };
    void verifySession();

    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (alive) { setEmail(''); setStatus('signed-out'); }
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'MFA_CHALLENGE_VERIFIED') {
        queueMicrotask(() => { void resolveAccess(); });
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
  if (status === 'mfa-enroll') return <MFASetupScreen onComplete={() => setStatus('authorized')} />;
  if (status === 'mfa-challenge') return <MFAChallengeScreen onComplete={() => setStatus('authorized')} />;
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


type PlanPrice = { id: string; amount_php: number; effective_at: string; change_note: string };
type SubscriptionPlan = { id: string; code: string; name: string; description: string; billing_interval: string; is_active: boolean };
function PricingSettings() {
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [prices, setPrices] = useState<PlanPrice[]>([]);
  const [name, setName] = useState('Standard');
  const [description, setDescription] = useState('Web2Table restaurant subscription. Branches are included.');
  const [amount, setAmount] = useState('1500');
  const [effectiveAt, setEffectiveAt] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
  });
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = async () => {
    if (!supabase) return;
    setBusy(true); setError('');
    const { data: plans, error: planError } = await supabase.from('business_subscription_plans').select('*').eq('code','standard-monthly').maybeSingle();
    if (planError) { setError(planError.message); setBusy(false); return; }
    if (!plans) { setError('The Standard plan has not been created yet.'); setBusy(false); return; }
    const { data: history, error: priceError } = await supabase.from('business_subscription_plan_prices').select('id,amount_php,effective_at,change_note').eq('plan_id', plans.id).order('effective_at',{ascending:false});
    if (priceError) { setError(priceError.message); setBusy(false); return; }
    setPlan(plans as SubscriptionPlan); setName(plans.name); setDescription(plans.description);
    const rows = (history ?? []) as PlanPrice[];
    setPrices(rows);
    const current = rows.find(row => new Date(row.effective_at).getTime() <= Date.now()) ?? rows[0];
    if (current) setAmount(String(current.amount_php));
    setBusy(false);
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !plan) return;
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) { setError('Enter a valid price greater than zero.'); return; }
    const effective = new Date(effectiveAt);
    if (Number.isNaN(effective.getTime())) { setError('Choose a valid effective date.'); return; }
    setSaving(true); setError(''); setNotice('');
    const { error: updateError } = await supabase.from('business_subscription_plans').update({name:name.trim(),description:description.trim(),updated_at:new Date().toISOString()}).eq('id',plan.id);
    if (updateError) { setError(updateError.message); setSaving(false); return; }
    const { data: userData } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from('business_subscription_plan_prices').insert({
      plan_id:plan.id, amount_php:numeric, effective_at:effective.toISOString(),
      created_by:userData.user?.id ?? null, change_note:'Price updated from Business Settings'
    });
    if (insertError) { setError(insertError.message); setSaving(false); await load(); return; }
    setNotice('Plan details and a new price version have been saved.');
    await load(); setSaving(false);
  };
  const current = prices.find(row => new Date(row.effective_at).getTime() <= Date.now());
  const upcoming = prices.filter(row => new Date(row.effective_at).getTime() > Date.now()).sort((x,y)=>new Date(x.effective_at).getTime()-new Date(y.effective_at).getTime())[0];
  return <div className="pricing-settings">
    <section className="panel pricing-panel">
      <div className="panel-heading"><div><h2>Subscription plan</h2><p>Manage the price charged to Web2Table restaurant tenants.</p></div><span className="pricing-tag">PHP · Monthly</span></div>
      {error && <div className="pricing-message pricing-error" role="alert">{error}</div>}
      {notice && <div className="pricing-message pricing-success" role="status">{notice}</div>}
      {busy ? <div className="pricing-loading">Loading plan settings…</div> : <form className="pricing-form" onSubmit={save}>
        <div className="pricing-fields">
          <div><label htmlFor="plan-name">Plan name</label><input id="plan-name" value={name} onChange={e=>setName(e.target.value)} required maxLength={80}/></div>
          <div><label htmlFor="plan-price">Monthly price (PHP)</label><div className="price-input"><span>₱</span><input id="plan-price" type="number" min="1" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required/></div></div>
        </div>
        <div><label htmlFor="plan-description">Description</label><textarea id="plan-description" rows={3} value={description} onChange={e=>setDescription(e.target.value)} maxLength={500}/></div>
        <div><label htmlFor="price-effective">New price effective from</label><input id="price-effective" type="datetime-local" value={effectiveAt} onChange={e=>setEffectiveAt(e.target.value)} required/><small>Use a future date to schedule a price increase. The new price is intended to apply at subscription renewal.</small></div>
        <div className="pricing-note"><ShieldCheck size={17}/><span>Price changes are saved as new versions. Previous prices remain in history; existing subscribers will keep their current billing amount until renewal logic is connected.</span></div>
        <div className="pricing-actions"><button className="button-primary" type="submit" disabled={saving || !plan}>{saving ? 'Saving…' : 'Save plan and price'}</button></div>
      </form>}
    </section>
    <section className="panel pricing-status">
      <div className="panel-heading"><div><h2>Pricing status</h2><p>Current and scheduled pricing</p></div></div>
      <div className="pricing-status-grid">
        <div><span>Current price</span><strong>{current ? '₱'+Number(current.amount_php).toLocaleString('en-PH',{minimumFractionDigits:2}) : '—'}</strong><small>{current ? new Date(current.effective_at).toLocaleDateString('en-PH',{dateStyle:'medium',timeZone:'Asia/Manila'}) : 'No active price'}</small></div>
        <div><span>Next scheduled price</span><strong>{upcoming ? '₱'+Number(upcoming.amount_php).toLocaleString('en-PH',{minimumFractionDigits:2}) : 'None'}</strong><small>{upcoming ? new Date(upcoming.effective_at).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Manila'}) : 'No scheduled increase'}</small></div>
      </div>
    </section>
    <section className="panel pricing-history">
      <div className="panel-heading"><div><h2>Price history</h2><p>Every price version is retained for audit and billing reference.</p></div></div>
      {prices.length ? <div className="pricing-table-wrap"><table className="pricing-table"><thead><tr><th>Monthly price</th><th>Effective date (Manila)</th><th>Status</th></tr></thead><tbody>{prices.map(row=>{const future=new Date(row.effective_at).getTime()>Date.now();return <tr key={row.id}><td>₱{Number(row.amount_php).toLocaleString('en-PH',{minimumFractionDigits:2})}</td><td>{new Date(row.effective_at).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Manila'})}</td><td><span className={future?'price-status-upcoming':'price-status-current'}>{future?'Scheduled':'Effective'}</span></td></tr>})}</tbody></table></div> : <div className="pricing-loading">No price history available.</div>}
    </section>
  </div>;
}

type TenantSubscriptionRow = {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_status: string;
  subscription_id: string | null;
  subscription_status: string | null;
  plan_id: string | null;
  plan_name: string | null;
  billing_interval: string | null;
  amount_php: number | null;
  currency: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_billing_at: string | null;
  cancel_at_period_end: boolean | null;
};

function formatPHP(value: number | null) {
  return value == null ? '—' : new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
}
function formatManilaDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' }) : '—';
}
function subscriptionStatusLabel(row: TenantSubscriptionRow) {
  return row.subscription_status ?? 'Not assigned';
}

type SubscriptionPlanOption = { id: string; name: string; billing_interval: string };
function todayInManila() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function manilaMidnight(value: string) {
  return value ? new Date(value + 'T00:00:00+08:00').toISOString() : null;
}
function subscriptionDatePreview(startValue: string, interval: string) {
  if (!startValue) return null;
  const [year, month, day] = startValue.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  const monthsToAdd = interval === 'year' ? 12 : 1;
  const targetMonth = start.getUTCMonth() + monthsToAdd;
  const targetYear = start.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const next = new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay)));
  const end = new Date(next);
  end.setUTCDate(end.getUTCDate() - 1);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const pretty = (value: string) => new Date(value + 'T00:00:00Z').toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return { start: pretty(startValue), end: pretty(iso(end)), next: pretty(iso(next)) };
}

function SubscriptionsWorkspace() {
  const [rows, setRows] = useState<TenantSubscriptionRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlanOption[]>([]);
  const [editingTenant, setEditingTenant] = useState<TenantSubscriptionRow | null>(null);
  const [planId, setPlanId] = useState('');
  const [subStatus, setSubStatus] = useState('pending');
  const [startedAt, setStartedAt] = useState(todayInManila());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const load = async () => {
    if (!supabase) return;
    setBusy(true); setError('');
    const { data, error: loadError } = await supabase.rpc('business_list_tenant_subscriptions');
    if (loadError) {
      setError(loadError.message);
      setBusy(false);
      return;
    }
    setRows((data ?? []) as TenantSubscriptionRow[]);
    setRefreshedAt(new Date());
    setBusy(false);
  };

  useEffect(() => {
    void load();
    const fetchPlans = async () => {
      if (!supabase) return;
      const { data, error: plansError } = await supabase.from('business_subscription_plans')
        .select('id,name,billing_interval').eq('is_active', true).order('name');
      if (plansError) setError(plansError.message);
      else setPlans((data ?? []) as SubscriptionPlanOption[]);
    };
    void fetchPlans();
  }, []);

  const beginAssignment = (row: TenantSubscriptionRow) => {
    setEditingTenant(row);
    setPlanId(row.plan_id ?? plans[0]?.id ?? '');
    setSubStatus(row.subscription_status ?? 'pending');
    setStartedAt(todayInManila());
    setNotes('');
    setSaveMessage('');
  };

  const saveAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !editingTenant || !planId) return;
    setSaving(true); setSaveMessage('');
    const { error: saveError } = await supabase.rpc('business_assign_tenant_subscription', {
      p_tenant_id: editingTenant.tenant_id,
      p_plan_id: planId,
      p_status: subStatus,
      p_started_at: manilaMidnight(startedAt),
      p_period_start: null,
      p_period_end: null,
      p_next_billing_at: null,
      p_notes: notes
    });
    setSaving(false);
    if (saveError) { setSaveMessage(saveError.message); return; }
    setEditingTenant(null);
    await load();
  };
  const activeCount = rows.filter(row => row.subscription_status === 'active').length;
  const pendingCount = rows.filter(row => row.subscription_status === 'pending').length;
  const unassignedCount = rows.filter(row => !row.subscription_id).length;

  return <div className="subscriptions-workspace">
    <div className="subscription-summary-grid">
      <article className="subscription-summary-card"><span>Total tenants</span><strong>{busy ? '—' : rows.length}</strong><small>Registered Web2Table tenants</small></article>
      <article className="subscription-summary-card"><span>Active subscriptions</span><strong>{busy ? '—' : activeCount}</strong><small>Currently marked active</small></article>
      <article className="subscription-summary-card"><span>Pending subscriptions</span><strong>{busy ? '—' : pendingCount}</strong><small>Awaiting activation or setup</small></article>
      <article className="subscription-summary-card"><span>Not assigned</span><strong>{busy ? '—' : unassignedCount}</strong><small>No subscription record yet</small></article>
    </div>
    <section className="panel subscription-list-panel">
      <div className="panel-heading"><div><h2>Tenant subscriptions</h2><p>Subscription records and tenant status. No payments are initiated from this screen.</p></div><button className="button-secondary" type="button" onClick={() => void load()} disabled={busy}>{busy ? 'Refreshing…' : 'Refresh'}</button></div>
      {error && <div className="pricing-message pricing-error" role="alert">{error}</div>}
      {busy && rows.length === 0 ? <div className="pricing-loading">Loading tenant subscription records…</div> : rows.length === 0 ? <div className="pricing-loading">No tenants were returned.</div> :
        <div className="pricing-table-wrap"><table className="pricing-table subscription-table"><thead><tr><th>Tenant</th><th>Tenant status</th><th>Plan</th><th>Subscription</th><th>Amount</th><th>Period ends</th><th>Next billing</th><th>Action</th></tr></thead><tbody>
          {rows.map(row => <tr key={row.tenant_id}>
            <td><strong>{row.tenant_name}</strong><small className="subscription-slug">{row.tenant_slug}</small></td>
            <td><span className="subscription-state">{row.tenant_status}</span></td>
            <td>{row.plan_name ?? '—'}</td>
            <td><span className={row.subscription_id ? 'subscription-state' : 'subscription-state subscription-unassigned'}>{subscriptionStatusLabel(row)}</span>{row.cancel_at_period_end && <small className="subscription-slug">Cancels at period end</small>}</td>
            <td>{formatPHP(row.amount_php)}{row.billing_interval && <small className="subscription-slug">/{row.billing_interval}</small>}</td>
            <td>{formatManilaDate(row.current_period_end)}</td>
            <td>{formatManilaDate(row.next_billing_at)}</td>
            <td><button className="button-secondary subscription-edit-button" type="button" onClick={() => beginAssignment(row)}>{row.subscription_id ? 'Manage' : 'Assign'}</button></td>
          </tr>)}
        </tbody></table></div>}
      {editingTenant && <form className="subscription-assignment-form" onSubmit={saveAssignment}>
        <div className="panel-heading"><div><h2>{editingTenant.subscription_id ? 'Manage subscription' : 'Assign a plan'}</h2><p>{editingTenant.tenant_name} · Choose a plan and start date. We'll calculate the billing schedule.</p></div><button className="button-secondary" type="button" onClick={() => setEditingTenant(null)}>Close</button></div>
        <div className="subscription-form-grid subscription-form-grid-simple">
          <label>Subscription plan
            <select required value={planId} onChange={e => setPlanId(e.target.value)}>
              <option value="">Choose a plan</option>
              {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} · {plan.billing_interval === 'year' ? 'Yearly' : 'Monthly'}</option>)}
            </select>
          </label>
          <label>Subscription status
            <select value={subStatus} onChange={e => setSubStatus(e.target.value)}>
              <option value="pending">Pending — not started yet</option>
              <option value="active">Active — service is running</option>
              <option value="trialing">Free trial</option>
              <option value="past_due">Past due — payment overdue</option>
              <option value="suspended">Suspended — service paused</option>
              <option value="cancelled">Cancelled — subscription ended</option>
            </select>
          </label>
          <label>Start date
            <input required type="date" value={startedAt} onChange={e => setStartedAt(e.target.value)} />
            <small>Choose the agreed date the subscription begins.</small>
          </label>
          <div className="subscription-schedule-preview">
            <div className="subscription-preview-heading"><strong>Billing schedule</strong><span>Calculated automatically</span></div>
            {(() => {
              const selectedPlan = plans.find(plan => plan.id === planId);
              const preview = subscriptionDatePreview(startedAt, selectedPlan?.billing_interval ?? 'month');
              if (!preview) return <p>Select a start date to preview the billing schedule.</p>;
              return <div className="subscription-preview-grid">
                <div><small>First billing period</small><strong>{preview.start} – {preview.end}</strong></div>
                <div><small>Next renewal date</small><strong>{preview.next}</strong></div>
              </div>;
            })()}
          </div>
          <label className="subscription-notes-field">Internal notes <span className="subscription-optional">Optional</span>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Subscription agreed with the restaurant owner" />
          </label>
        </div>
        <div className="subscription-form-footer">
          <span>Dates renew automatically. A subscription charge record is created for active subscriptions. No card is charged automatically.</span>
          <button className="button-primary" type="submit" disabled={saving || !planId || !startedAt}>{saving ? 'Saving…' : 'Save subscription'}</button>
        </div>
        {saveMessage && <div className="pricing-message pricing-error" role="alert">{saveMessage}</div>}
      </form>}
      {refreshedAt && <div className="subscription-refresh-note">Last refreshed {refreshedAt.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' })} · Asia/Manila</div>}
    </section>
  </div>;
}

type SubscriptionPaymentRow = {
  charge_id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  subscription_id: string;
  amount_php: number;
  status: string;
  billing_period_start: string | null;
  billing_period_end: string | null;
  due_at: string;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_notes: string | null;
  created_at: string;
};

function paymentMethodLabel(method: string | null) {
  if (!method) return '—';
  return ({ bank_transfer: 'Bank transfer', gcash: 'GCash', maya: 'Maya', cash: 'Cash', other: 'Other' } as Record<string,string>)[method] ?? method;
}
function PaymentsWorkspace() {
  const [rows, setRows] = useState<SubscriptionPaymentRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<SubscriptionPaymentRow | null>(null);
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    if (!supabase) return;
    setBusy(true); setError('');
    const { data, error: loadError } = await supabase.rpc('business_list_subscription_payments');
    if (loadError) setError(loadError.message);
    else setRows((data ?? []) as SubscriptionPaymentRow[]);
    setBusy(false);
  };
  useEffect(() => { void load(); }, []);

  const pending = rows.filter(row => ['pending','processing','failed'].includes(row.status));
  const paid = rows.filter(row => row.status === 'paid');
  const outstanding = pending.reduce((sum,row) => sum + Number(row.amount_php),0);
  const collected = paid.reduce((sum,row) => sum + Number(row.amount_php),0);
  const visible = rows.filter(row => filter === 'all' || (filter === 'outstanding' ? ['pending','processing','failed'].includes(row.status) : row.status === filter));

  const openRecord = (row: SubscriptionPaymentRow) => {
    setSelected(row); setMethod('bank_transfer'); setReference(''); setNotes(''); setFormError('');
  };
  const recordPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !selected) return;
    setSaving(true); setFormError('');
    const { error: saveError } = await supabase.rpc('business_record_subscription_payment', {
      p_charge_id: selected.charge_id,
      p_payment_method: method,
      p_payment_reference: reference,
      p_payment_notes: notes,
      p_paid_at: null
    });
    setSaving(false);
    if (saveError) { setFormError(saveError.message); return; }
    setSelected(null);
    await load();
  };

  return <div className="payments-workspace">
    <div className="payment-notice"><strong>Subscription collections only</strong><span>These are payments owed to Web2Table by restaurant tenants. Restaurant customer order payments are not included here.</span></div>
    <div className="subscription-summary-grid payment-summary-grid">
      <article className="subscription-summary-card"><span>Total charges</span><strong>{busy ? '—' : rows.length}</strong><small>Generated subscription charges</small></article>
      <article className="subscription-summary-card"><span>Collected</span><strong>{busy ? '—' : formatPHP(collected)}</strong><small>Marked paid after verification</small></article>
      <article className="subscription-summary-card"><span>Outstanding</span><strong>{busy ? '—' : formatPHP(outstanding)}</strong><small>Pending, processing or failed</small></article>
      <article className="subscription-summary-card"><span>Paid records</span><strong>{busy ? '—' : paid.length}</strong><small>Confirmed collections</small></article>
    </div>
    <section className="panel subscription-list-panel">
      <div className="panel-heading payment-panel-heading"><div><h2>Subscription charges</h2><p>Review charges and record payments you've actually received.</p></div><div className="payment-toolbar"><select aria-label="Filter charges" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All charges</option><option value="outstanding">Outstanding</option><option value="paid">Paid</option><option value="voided">Voided</option><option value="refunded">Refunded</option></select><button className="button-secondary" type="button" onClick={() => void load()} disabled={busy}>{busy ? 'Refreshing…' : 'Refresh'}</button></div></div>
      {error && <div className="pricing-message pricing-error" role="alert">{error}</div>}
      {busy && rows.length === 0 ? <div className="pricing-loading">Loading subscription charges…</div> : visible.length === 0 ? <div className="pricing-loading">{rows.length === 0 ? 'No subscription charges have been generated yet.' : 'No charges match this filter.'}</div> :
        <div className="pricing-table-wrap"><table className="pricing-table subscription-table payment-table"><thead><tr><th>Tenant</th><th>Billing period</th><th>Due date</th><th>Amount</th><th>Status</th><th>Method / reference</th><th>Paid date</th><th>Action</th></tr></thead><tbody>
          {visible.map(row => <tr key={row.charge_id}>
            <td><strong>{row.tenant_name}</strong><small className="subscription-slug">{row.tenant_slug}</small></td>
            <td>{formatManilaDate(row.billing_period_start)} – {formatManilaDate(row.billing_period_end)}</td>
            <td>{formatManilaDate(row.due_at)}</td>
            <td><strong>{formatPHP(Number(row.amount_php))}</strong></td>
            <td><span className={row.status === 'paid' ? 'subscription-state' : 'subscription-state subscription-unassigned'}>{row.status}</span></td>
            <td>{paymentMethodLabel(row.payment_method)}{row.payment_reference && <small className="subscription-slug">{row.payment_reference}</small>}</td>
            <td>{formatManilaDate(row.paid_at)}</td>
            <td>{['pending','processing','failed'].includes(row.status) ? <button className="button-secondary subscription-edit-button" type="button" onClick={() => openRecord(row)}>Record payment</button> : '—'}</td>
          </tr>)}
        </tbody></table></div>}
    </section>
    {selected && <form className="subscription-assignment-form payment-record-form" onSubmit={recordPayment}>
      <div className="panel-heading"><div><h2>Record payment received</h2><p>{selected.tenant_name} · {formatPHP(Number(selected.amount_php))} subscription charge</p></div><button className="button-secondary" type="button" onClick={() => setSelected(null)}>Close</button></div>
      <div className="payment-confirm-warning"><strong>Only continue after verifying the funds were received.</strong><span>This records an existing payment. It does not charge a card, create a PayMongo checkout, or move money.</span></div>
      <div className="subscription-form-grid">
        <label>Payment method<select required value={method} onChange={e => setMethod(e.target.value)}><option value="bank_transfer">Bank transfer</option><option value="gcash">GCash</option><option value="maya">Maya</option><option value="cash">Cash</option><option value="other">Other</option></select></label>
        <label>Reference number <span className="subscription-optional">Optional</span><input value={reference} onChange={e => setReference(e.target.value)} placeholder="Transaction ID or deposit reference" /></label>
        <label className="subscription-notes-field">Internal notes <span className="subscription-optional">Optional</span><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Verified against bank statement" /></label>
      </div>
      {formError && <div className="pricing-message pricing-error" role="alert">{formError}</div>}
      <div className="subscription-form-footer"><span>Confirming this will mark the charge as paid and record your account as the receiver.</span><button className="button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Confirm payment received'}</button></div>
    </form>}
  </div>;
}

function downloadBusinessCsv(filename:string, rows:(string|number|null|undefined)[][]) {
  const csv=rows.map(row=>row.map(value=>{
    const text=String(value??'');
    return '"' + text.replace(/"/g,'""') + '"';
  }).join(',')).join('\r\n');
  const blob=new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
}

type BusinessExpense = { id:string; category:string; description:string; amount_php:number; expense_date:string; payment_method:string; reference:string|null; notes:string; created_at:string };
const EXPENSE_CATEGORIES = ['Software & services','Hosting & infrastructure','Marketing & advertising','Office & supplies','Transportation','Professional fees','Bank & payment fees','Taxes & permits','Equipment','Other'];
function ExpensesWorkspace() {
  const [rows,setRows]=useState<BusinessExpense[]>([]);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const [editing,setEditing]=useState<BusinessExpense|null>(null);
  const [showForm,setShowForm]=useState(false);
  const [category,setCategory]=useState(EXPENSE_CATEGORIES[0]);
  const [description,setDescription]=useState('');
  const [amount,setAmount]=useState('');
  const [date,setDate]=useState(todayInManila());
  const [method,setMethod]=useState('bank_transfer');
  const [reference,setReference]=useState('');
  const [notes,setNotes]=useState('');
  const [filter,setFilter]=useState('all');
  const [message,setMessage]=useState('');
  const load=async()=>{if(!supabase)return;setBusy(true);setError('');const {data,error:e}=await supabase.rpc('business_list_expenses',{p_from:null,p_to:null});if(e)setError(e.message);else setRows((data??[]) as BusinessExpense[]);setBusy(false);};
  useEffect(()=>{void load();},[]);
  const reset=()=>{setEditing(null);setCategory(EXPENSE_CATEGORIES[0]);setDescription('');setAmount('');setDate(todayInManila());setMethod('bank_transfer');setReference('');setNotes('');setMessage('');};
  const open=(row?:BusinessExpense)=>{reset();if(row){setEditing(row);setCategory(row.category);setDescription(row.description);setAmount(String(row.amount_php));setDate(row.expense_date);setMethod(row.payment_method);setReference(row.reference??'');setNotes(row.notes);}setShowForm(true);};
  const save=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();if(!supabase)return;setSaving(true);setMessage('');const {error:e2}=await supabase.rpc('business_save_expense',{p_id:editing?.id??null,p_category:category,p_description:description,p_amount:Number(amount),p_expense_date:date,p_payment_method:method,p_reference:reference,p_notes:notes});setSaving(false);if(e2){setMessage(e2.message);return;}setShowForm(false);reset();await load();};
  const remove=async(row:BusinessExpense)=>{if(!supabase||!window.confirm('Delete this expense record? This cannot be undone.'))return;const {error:e}=await supabase.rpc('business_delete_expense',{p_id:row.id});if(e)setError(e.message);else await load();};
  const visible=rows.filter(r=>filter==='all'||r.category===filter);
  const total=rows.reduce((s,r)=>s+Number(r.amount_php),0);
  return <div className="business-module">
    <div className="module-toolbar"><div><h2>Expense records</h2><p>Track Web2Table operating costs. These are internal business expenses, not tenant charges.</p></div><div className="module-toolbar-actions"><button className="button-secondary" onClick={()=>downloadBusinessCsv('web2table-expenses.csv',[['Date','Description','Category','Payment method','Reference','Amount PHP','Notes'],...visible.map(r=>[r.expense_date,r.description,r.category,paymentMethodLabel(r.payment_method),r.reference,Number(r.amount_php),r.notes])])} disabled={busy||visible.length===0}><Download size={14}/> Export CSV</button><button className="button-secondary" onClick={()=>void load()} disabled={busy}>Refresh</button><button className="button-primary" onClick={()=>open()}><Plus size={15}/> Add expense</button></div></div>
    <div className="subscription-summary-grid expense-summary-grid">
      <article className="subscription-summary-card"><span>Recorded expenses</span><strong>{busy?'—':rows.length}</strong><small>All recorded entries</small></article>
      <article className="subscription-summary-card"><span>Total expenses</span><strong>{busy?'—':formatPHP(total)}</strong><small>Across all recorded dates</small></article>
      <article className="subscription-summary-card"><span>This month</span><strong>{busy?'—':formatPHP(rows.filter(r=>r.expense_date.slice(0,7)===todayInManila().slice(0,7)).reduce((s,r)=>s+Number(r.amount_php),0))}</strong><small>Based on expense date</small></article>
      <article className="subscription-summary-card"><span>Categories</span><strong>{busy?'—':new Set(rows.map(r=>r.category)).size}</strong><small>Used in expense records</small></article>
    </div>
    {error&&<div className="pricing-message pricing-error">{error}</div>}
    <section className="panel subscription-list-panel">
      <div className="panel-heading payment-panel-heading"><div><h2>All expenses</h2><p>Use Edit to correct an entry. Keep references for audit purposes.</p></div><select className="expense-filter" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All categories</option>{[...new Set(rows.map(r=>r.category))].map(x=><option key={x} value={x}>{x}</option>)}</select></div>
      {busy&&rows.length===0?<div className="pricing-loading">Loading expenses…</div>:visible.length===0?<div className="pricing-loading">{rows.length===0?'No expenses recorded yet. Add your first operating expense.':'No expenses in this category.'}</div>:
      <div className="pricing-table-wrap"><table className="pricing-table expense-table"><thead><tr><th>Date</th><th>Expense</th><th>Category</th><th>Method</th><th>Reference</th><th>Amount</th><th>Actions</th></tr></thead><tbody>
      {visible.map(row=><tr key={row.id}><td>{formatManilaDate(row.expense_date+'T00:00:00+08:00')}</td><td><strong>{row.description}</strong>{row.notes&&<small className="subscription-slug">{row.notes}</small>}</td><td>{row.category}</td><td>{paymentMethodLabel(row.payment_method)}</td><td>{row.reference||'—'}</td><td><strong>{formatPHP(Number(row.amount_php))}</strong></td><td><div className="expense-row-actions"><button className="button-secondary subscription-edit-button" onClick={()=>open(row)}>Edit</button><button className="button-secondary subscription-edit-button expense-delete" onClick={()=>void remove(row)}>Delete</button></div></td></tr>)}
      </tbody></table></div>}
    </section>
    {showForm&&<form className="subscription-assignment-form expense-form" onSubmit={save}>
      <div className="panel-heading"><div><h2>{editing?'Edit expense':'Add an expense'}</h2><p>Enter an amount actually paid or incurred by Web2Table.</p></div><button type="button" className="button-secondary" onClick={()=>setShowForm(false)}>Close</button></div>
      <div className="subscription-form-grid">
        <label>Category<select required value={category} onChange={e=>setCategory(e.target.value)}>{EXPENSE_CATEGORIES.map(x=><option key={x}>{x}</option>)}{!EXPENSE_CATEGORIES.includes(category)&&<option>{category}</option>}</select></label>
        <label>Expense date<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label>
        <label className="subscription-notes-field">Description<input required value={description} onChange={e=>setDescription(e.target.value)} placeholder="e.g. Monthly hosting subscription"/></label>
        <label>Amount (PHP)<input type="number" min="0.01" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></label>
        <label>Payment method<select value={method} onChange={e=>setMethod(e.target.value)}><option value="bank_transfer">Bank transfer</option><option value="gcash">GCash</option><option value="maya">Maya</option><option value="cash">Cash</option><option value="card">Card</option><option value="other">Other</option></select></label>
        <label>Reference number <span className="subscription-optional">Optional</span><input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Transaction or receipt reference"/></label>
        <label className="subscription-notes-field">Notes <span className="subscription-optional">Optional</span><textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Additional details"/></label>
      </div>
      {message&&<div className="pricing-message pricing-error">{message}</div>}
      <div className="subscription-form-footer"><span>Records are private to authorized Web2Table Business Owners.</span><button className="button-primary" type="submit" disabled={saving}>{saving?'Saving…':editing?'Save changes':'Save expense'}</button></div>
    </form>}
  </div>;
}

type FinancialReportData={revenue:number;expenses:number;expense_count:number;paid_charge_count:number;monthly:{month:string;revenue:number;expenses:number;net:number}[];by_category:{category:string;total:number}[]};
function FinancialReportsWorkspace(){
 const today=todayInManila();const [from,setFrom]=useState(today.slice(0,4)+'-01-01');const [to,setTo]=useState(today);
 const [data,setData]=useState<FinancialReportData|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const load=async()=>{if(!supabase)return;if(!from||!to||from>to){setError('Choose a valid date range.');return;}setBusy(true);setError('');const {data:result,error:e}=await supabase.rpc('business_financial_report',{p_from:from,p_to:to});if(e)setError(e.message);else setData(result as FinancialReportData);setBusy(false);};
 useEffect(()=>{void load();},[]);
 const net=(data?.revenue??0)-(data?.expenses??0);
 const money=(n:number)=>formatPHP(Number(n??0));
 const monthLabel=(v:string)=>{const raw=String(v??'');const normalized=raw.length===10?raw+'T00:00:00Z':raw;const parsed=new Date(normalized);return Number.isNaN(parsed.getTime())?raw:parsed.toLocaleDateString('en-PH',{month:'short',year:'numeric',timeZone:'UTC'});};
 const max=Math.max(1,...(data?.monthly??[]).flatMap(m=>[Number(m.revenue),Number(m.expenses)]));
 return <div className="business-module">
  <div className="module-toolbar module-toolbar-compact"><div className="report-range"><label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><button className="button-secondary" onClick={()=>data&&downloadBusinessCsv('web2table-financial-report.csv',[['Report from',from],['Report to',to],[],['Metric','Amount PHP'],['Collected revenue',Number(data.revenue)],['Operating expenses',Number(data.expenses)],['Net operating result',Number(data.revenue)-Number(data.expenses)],[],['Month','Revenue PHP','Expenses PHP','Net PHP'],...(data.monthly??[]).map(m=>[m.month,Number(m.revenue),Number(m.expenses),Number(m.net)]),[],['Expense category','Total PHP'],...(data.by_category??[]).map(x=>[x.category,Number(x.total)])])} disabled={!data||busy}><Download size={14}/> Export CSV</button><button className="button-primary" onClick={()=>void load()} disabled={busy}>{busy?'Updating…':'Run report'}</button></div></div>
  {error&&<div className="pricing-message pricing-error">{error}</div>}
  {!data&&busy?<div className="pricing-loading">Preparing financial report…</div>:data&&<>
   <div className="subscription-summary-grid report-summary-grid">
    <article className="subscription-summary-card"><span>Collected revenue</span><strong>{money(data.revenue)}</strong><small>{data.paid_charge_count} confirmed subscription payments</small></article>
    <article className="subscription-summary-card"><span>Operating expenses</span><strong>{money(data.expenses)}</strong><small>{data.expense_count} expense records</small></article>
    <article className="subscription-summary-card"><span>Net operating result</span><strong className={net>=0?'report-positive':'report-negative'}>{money(net)}</strong><small>Collected revenue minus recorded expenses</small></article>
   </div>
   <div className="report-content-grid">
    <section className="panel"><div className="panel-heading"><div><h2>Monthly performance</h2><p>Revenue versus expenses by month</p></div></div>
     {(data.monthly??[]).length===0?<div className="pricing-loading">No activity in this period.</div>:<div className="monthly-report-list">{data.monthly.map(m=><div className="monthly-report-row" key={m.month}><div className="monthly-report-head"><strong>{monthLabel(m.month)}</strong><span>Net {money(Number(m.net))}</span></div><div className="report-bars"><div><small>Revenue</small><i><span className="report-revenue-bar" style={{width:(Number(m.revenue)/max*100)+'%'}}/></i><b>{money(Number(m.revenue))}</b></div><div><small>Expenses</small><i><span className="report-expense-bar" style={{width:(Number(m.expenses)/max*100)+'%'}}/></i><b>{money(Number(m.expenses))}</b></div></div></div>)}</div>}
    </section>
    <section className="panel"><div className="panel-heading"><div><h2>Expenses by category</h2><p>Where operating costs are going</p></div></div>
     {(data.by_category??[]).length===0?<div className="pricing-loading">No expenses recorded for this period.</div>:<div className="category-report-list">{data.by_category.map(item=><div key={item.category}><span>{item.category}</span><strong>{money(Number(item.total))}</strong></div>)}</div>}
    </section>
   </div>
   <p className="report-footnote">This is an internal management report, not a BIR invoice, official financial statement, or tax filing. It excludes unpaid subscription charges and any revenue not recorded in Web2Table Business.</p>
  </>}
 </div>;
}

type BusinessActivityRow={id:string;actor_email:string|null;action:string;entity_type:string;entity_id:string|null;summary:string;metadata:Record<string,unknown>;created_at:string};
function ActivityLogWorkspace(){
 const [rows,setRows]=useState<BusinessActivityRow[]>([]);
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState('');
 const [filter,setFilter]=useState('all');
 const load=async()=>{if(!supabase)return;setBusy(true);setError('');const {data,error:e}=await supabase.rpc('business_list_activity_logs',{p_limit:250,p_entity_type:filter==='all'?null:filter});if(e)setError(e.message);else setRows((data??[]) as BusinessActivityRow[]);setBusy(false);};
 useEffect(()=>{void load();},[filter]);
 const dateLabel=(v:string)=>new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Manila'}).format(new Date(v));
 const actionLabel=(v:string)=>v.charAt(0).toUpperCase()+v.slice(1);
 return <div className="business-module">
  <div className="module-toolbar"><div><h2>Business activity</h2><p>Audit trail of expense and subscription charge changes, including who made them and when.</p></div><div className="module-toolbar-actions"><select className="expense-filter" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All activity</option><option value="expense">Expenses</option><option value="subscription_charge">Subscription charges</option><option value="subscription">Subscriptions</option><option value="subscription_plan">Plans</option><option value="subscription_plan_price">Plan pricing</option></select><button className="button-secondary" onClick={()=>void load()} disabled={busy}>Refresh</button></div></div>
  {error&&<div className="pricing-message pricing-error" role="alert">{error}</div>}
  <section className="panel subscription-list-panel">
   <div className="panel-heading"><div><h2>Activity history</h2><p>Latest 250 events · Times shown in Asia/Manila</p></div><span className="pricing-tag">{rows.length} events</span></div>
   {busy&&rows.length===0?<div className="pricing-loading">Loading activity…</div>:rows.length===0?<div className="pricing-loading">No recorded activity yet. New expense and subscription charge changes will appear here.</div>:
    <div className="activity-log-list">{rows.map(row=><article className="activity-log-row" key={row.id}>
      <div className="activity-log-symbol"><ActivityIcon/></div>
      <div className="activity-log-main"><div className="activity-log-title"><strong>{row.summary}</strong><span className="activity-log-action">{actionLabel(row.action)}</span></div><div className="activity-log-meta"><span>{row.actor_email??'System / automated process'}</span><span>{row.entity_type==='expense'?'Expense':row.entity_type==='subscription_charge'?'Subscription charge':row.entity_type==='subscription'?'Subscription':row.entity_type==='subscription_plan'?'Plan':row.entity_type==='subscription_plan_price'?'Plan pricing':'Business record'}</span><time>{dateLabel(row.created_at)}</time></div>
      {row.metadata&&Object.keys(row.metadata).length>0&&<div className="activity-log-details">{row.metadata.amount_php!==undefined&&<span>{formatPHP(Number(row.metadata.amount_php))}</span>}{row.metadata.category!==undefined&&<span>{String(row.metadata.category)}</span>}{row.metadata.status!==undefined&&<span>Status: {String(row.metadata.status)}</span>}{row.metadata.expense_date!==undefined&&<span>Date: {String(row.metadata.expense_date)}</span>}</div>}
      </div>
    </article>)}</div>}
  </section>
 </div>;
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
          <div><strong>Web2Table</strong><span>BUSINESS</span></div>
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        
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
          <div className="profile-row"><div className="profile-avatar"><img src="https://raw.githubusercontent.com/web2table/Web2Table-Billing/main/web2table1.png" alt="" /></div><div><strong>{email}</strong><span>Business Owner</span></div><button className="icon-button" onClick={onSignOut} aria-label="Sign out" title="Sign out"><ChevronDown size={16} /></button></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button><div className="breadcrumb">Web2Table <span>/</span> <strong>{meta.title}</strong></div></div>
          <div className="topbar-actions"><div className="environment-chip"><span /> Internal workspace</div><button className="icon-button" aria-label="Search"><Search size={18} /></button><button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /></button><div className="topbar-divider" /><div className="topbar-user"><img src="https://raw.githubusercontent.com/web2table/Web2Table-Billing/main/web2table1.png" alt="Web2Table" /></div></div>
        </header>

        <div className="page-content">
          {!isSupabaseConfigured && <div className="connection-banner"><div className="connection-icon"><Command size={17} /></div><div><strong>Data connection not configured</strong><span>Add the public Supabase URL and publishable key to the deployment environment. No live financial figures are being shown.</span></div></div>}

          {active === 'settings' ? <PricingSettings /> : active === 'subscriptions' ? <SubscriptionsWorkspace /> : active === 'payments' ? <PaymentsWorkspace /> : active === 'expenses' ? <ExpensesWorkspace /> : active === 'reports' ? <FinancialReportsWorkspace /> : active === 'audit' ? <ActivityLogWorkspace /> : active === 'overview' ? (
            <>
              <div className="section-title-row section-title-row-compact"><button className="period-button">All time <ChevronDown size={14} /></button></div>
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
