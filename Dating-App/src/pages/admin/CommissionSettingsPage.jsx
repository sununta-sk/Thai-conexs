import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { supabase } from '../lib/supabaseClient'

const TIER_DEFAULTS = [
  { tier: 'standard', label: 'Standard', description: 'Default for all new affiliates', color: '#64748b' },
  { tier: 'silver', label: 'Silver', description: '50+ referrals', color: '#94a3b8' },
  { tier: 'gold', label: 'Gold', description: '200+ referrals', color: '#f59e0b' },
  { tier: 'platinum', label: 'Platinum', description: '500+ referrals', color: '#e91e63' },
]

export default function CommissionSettingsPage() {
  const [settings, setSettings] = useState(null)
  const [tiers, setTiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: set }, { data: tierData }] = await Promise.all([
      supabase.from('affiliate_settings').select('*').single(),
      supabase.from('affiliate_commission_tiers').select('*').order('min_referrals'),
    ])
    setSettings(set || {
      default_commission_rate: 20,
      min_payout: 50,
      auto_approve_threshold: 100,
      payout_day: 'Monday',
      cookie_duration_days: 30,
      allow_self_referral: false,
      require_verified_email: true,
    })
    setTiers(tierData?.length ? tierData : TIER_DEFAULTS.map((t, i) => ({
      tier: t.tier, label: t.label, commission_rate: [20, 25, 30, 35][i], min_referrals: [0, 50, 200, 500][i]
    })))
    setLoading(false)
  }

  function setField(key, val) {
    setSettings(prev => ({ ...prev, [key]: val }))
  }

  function setTierField(index, key, val) {
    setTiers(prev => prev.map((t, i) => i === index ? { ...t, [key]: val } : t))
  }

  async function handleSave() {
    setSaving(true)
    const { id, ...rest } = settings
    await supabase.from('affiliate_settings').upsert({ ...rest, id: id || 1 })
    await Promise.all(tiers.map(t =>
      supabase.from('affiliate_commission_tiers').upsert(t, { onConflict: 'tier' })
    ))
    setSaving(false)
    setSavedMsg('Settings saved!')
    setTimeout(() => setSavedMsg(''), 3000)
  }

  if (loading) return <AdminLayout><div style={S.center}>Loading settings…</div></AdminLayout>

  return (
    <AdminLayout>
      <div style={S.page}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <h1 style={S.title}>Commission Settings</h1>
            <p style={S.subtitle}>Configure affiliate program rules, commission rates, and payout policies</p>
          </div>
          <div style={S.headerRight}>
            {savedMsg && <span style={S.savedMsg}>✓ {savedMsg}</span>}
            <button onClick={handleSave} disabled={saving} style={{ ...S.btnSave, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={S.tabs}>
          {[
            { key: 'general', label: '⚙️ General' },
            { key: 'tiers', label: '🏅 Commission Tiers' },
            { key: 'payouts', label: '💸 Payout Rules' },
            { key: 'tracking', label: '🔗 Tracking' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ ...S.tab, ...(activeTab === t.key ? S.tabActive : {}) }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* General Tab */}
        {activeTab === 'general' && (
          <div style={S.card}>
            <h2 style={S.cardTitle}>General Commission Settings</h2>

            <div style={S.formGrid}>
              <SettingField
                label="Default Commission Rate"
                hint="Applied to all new affiliates (Standard tier)"
                suffix="%">
                <input type="number" min={0} max={100} step={0.5}
                  value={settings.default_commission_rate || ''}
                  onChange={e => setField('default_commission_rate', parseFloat(e.target.value))}
                  style={S.numInput} />
              </SettingField>

              <SettingField
                label="Cookie Duration"
                hint="How long the referral cookie lasts"
                suffix="days">
                <input type="number" min={1} max={365}
                  value={settings.cookie_duration_days || ''}
                  onChange={e => setField('cookie_duration_days', parseInt(e.target.value))}
                  style={S.numInput} />
              </SettingField>
            </div>

            <div style={S.toggleSection}>
              <ToggleField
                label="Allow Self-Referral"
                hint="Affiliates can earn commission from their own signups"
                value={settings.allow_self_referral}
                onChange={v => setField('allow_self_referral', v)}
              />
              <ToggleField
                label="Require Verified Email"
                hint="Only count referrals from verified email accounts"
                value={settings.require_verified_email}
                onChange={v => setField('require_verified_email', v)}
              />
              <ToggleField
                label="Auto-Upgrade Tiers"
                hint="Automatically promote affiliates when they hit referral milestones"
                value={settings.auto_upgrade_tiers}
                onChange={v => setField('auto_upgrade_tiers', v)}
              />
            </div>

            {/* Preview */}
            <div style={S.previewBox}>
              <div style={S.previewTitle}>📊 Commission Preview</div>
              <p style={S.previewText}>
                If a user pays <strong>$30/month</strong> after clicking an affiliate link,
                that affiliate earns <strong style={{ color: '#e91e63' }}>
                  ${((30 * (settings.default_commission_rate || 20)) / 100).toFixed(2)}/month
                </strong> ({settings.default_commission_rate || 20}% commission).
              </p>
            </div>
          </div>
        )}

        {/* Tiers Tab */}
        {activeTab === 'tiers' && (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <h2 style={S.cardTitle}>Commission Tiers</h2>
              <p style={S.cardSub}>Higher tiers earn more commission. Affiliates auto-upgrade when they hit referral milestones.</p>
            </div>
            <div style={S.tiersGrid}>
              {tiers.map((tier, i) => {
                const meta = TIER_DEFAULTS.find(d => d.tier === tier.tier) || TIER_DEFAULTS[i] || {}
                return (
                  <div key={tier.tier} style={{ ...S.tierCard, borderTop: `3px solid ${meta.color || '#334155'}` }}>
                    <div style={S.tierHeader}>
                      <div>
                        <div style={{ ...S.tierName, color: meta.color }}>{meta.label || tier.tier}</div>
                        <div style={S.tierDesc}>{meta.description}</div>
                      </div>
                    </div>
                    <div style={S.tierFields}>
                      <div style={S.tierField}>
                        <label style={S.tierLabel}>Commission Rate</label>
                        <div style={S.tierInputWrap}>
                          <input type="number" min={0} max={100} step={0.5}
                            value={tier.commission_rate || ''}
                            onChange={e => setTierField(i, 'commission_rate', parseFloat(e.target.value))}
                            style={S.tierInput} />
                          <span style={S.tierSuffix}>%</span>
                        </div>
                      </div>
                      <div style={S.tierField}>
                        <label style={S.tierLabel}>Min. Referrals to Unlock</label>
                        <input type="number" min={0}
                          value={tier.min_referrals || 0}
                          onChange={e => setTierField(i, 'min_referrals', parseInt(e.target.value))}
                          disabled={i === 0}
                          style={{ ...S.tierInput, opacity: i === 0 ? 0.5 : 1, width: '100%' }} />
                      </div>
                    </div>
                    {/* Rate Bar */}
                    <div style={S.rateBar}>
                      <div style={{ ...S.rateBarFill, width: `${Math.min(tier.commission_rate || 0, 50) * 2}%`, background: meta.color || '#e91e63' }} />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '12px', color: meta.color, fontWeight: 700, marginTop: '4px' }}>
                      {tier.commission_rate || 0}%
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Payout Rules Tab */}
        {activeTab === 'payouts' && (
          <div style={S.card}>
            <h2 style={S.cardTitle}>Payout Rules</h2>

            <div style={S.formGrid}>
              <SettingField label="Minimum Payout Amount" hint="Affiliates cannot request less than this amount" suffix="USD">
                <input type="number" min={1}
                  value={settings.min_payout || ''}
                  onChange={e => setField('min_payout', parseFloat(e.target.value))}
                  style={S.numInput} />
              </SettingField>

              <SettingField label="Auto-Approve Threshold" hint="Requests ≤ this amount are approved automatically" suffix="USD">
                <input type="number" min={0}
                  value={settings.auto_approve_threshold || ''}
                  onChange={e => setField('auto_approve_threshold', parseFloat(e.target.value))}
                  style={S.numInput} />
              </SettingField>
            </div>

            <div style={S.formGrid}>
              <SettingField label="Payout Processing Day" hint="Day of the week when payouts are sent">
                <select value={settings.payout_day || 'Monday'} onChange={e => setField('payout_day', e.target.value)} style={S.select}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d =>
                    <option key={d} value={d}>{d}</option>)}
                </select>
              </SettingField>

              <SettingField label="Referral Hold Period" hint="Days before a commission becomes withdrawable" suffix="days">
                <input type="number" min={0} max={90}
                  value={settings.hold_period_days || 14}
                  onChange={e => setField('hold_period_days', parseInt(e.target.value))}
                  style={S.numInput} />
              </SettingField>
            </div>

            {/* Flow Diagram */}
            <div style={S.flowDiagram}>
              <div style={S.flowTitle}>📋 Payout Flow</div>
              <div style={S.flowSteps}>
                {[
                  { icon: '📝', label: 'Request Submitted', sub: 'Affiliate submits payout' },
                  { icon: '⚡', label: `≤ $${settings.auto_approve_threshold || 100}?`, sub: 'Auto-approve check' },
                  { icon: '✓', label: 'Approved', sub: 'Manual or automatic' },
                  { icon: '💸', label: 'Paid', sub: `Every ${settings.payout_day || 'Monday'}` },
                ].map((step, i) => (
                  <div key={i} style={S.flowStepWrap}>
                    <div style={S.flowStep}>
                      <span style={S.flowIcon}>{step.icon}</span>
                      <div style={S.flowLabel}>{step.label}</div>
                      <div style={S.flowSub}>{step.sub}</div>
                    </div>
                    {i < 3 && <div style={S.flowArrow}>→</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tracking Tab */}
        {activeTab === 'tracking' && (
          <div style={S.card}>
            <h2 style={S.cardTitle}>Tracking & Attribution</h2>
            <div style={S.formGrid}>
              <SettingField label="Cookie Duration" hint="How long referral attribution lasts" suffix="days">
                <input type="number" min={1} max={365}
                  value={settings.cookie_duration_days || 30}
                  onChange={e => setField('cookie_duration_days', parseInt(e.target.value))}
                  style={S.numInput} />
              </SettingField>
              <SettingField label="Attribution Model" hint="How credit is assigned for conversions">
                <select value={settings.attribution_model || 'first_click'} onChange={e => setField('attribution_model', e.target.value)} style={S.select}>
                  <option value="first_click">First Click</option>
                  <option value="last_click">Last Click</option>
                  <option value="linear">Linear (split)</option>
                </select>
              </SettingField>
            </div>
            <div style={S.toggleSection}>
              <ToggleField label="Track Returning Users" hint="Count conversions even if user visited before via organic" value={settings.track_returning} onChange={v => setField('track_returning', v)} />
              <ToggleField label="Count Subscription Renewals" hint="Earn commission on every renewal, not just first payment" value={settings.recurring_commission} onChange={v => setField('recurring_commission', v)} />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

/* Sub-components */
function SettingField({ label, hint, suffix, children }) {
  return (
    <div style={SF.wrap}>
      <div style={SF.labelWrap}>
        <label style={SF.label}>{label}</label>
        {hint && <span style={SF.hint}>{hint}</span>}
      </div>
      <div style={SF.inputRow}>
        {children}
        {suffix && <span style={SF.suffix}>{suffix}</span>}
      </div>
    </div>
  )
}

function ToggleField({ label, hint, value, onChange }) {
  return (
    <div style={SF.toggleWrap}>
      <div style={{ flex: 1 }}>
        <div style={SF.toggleLabel}>{label}</div>
        {hint && <div style={SF.hint}>{hint}</div>}
      </div>
      <div onClick={() => onChange(!value)} style={{ ...SF.toggle, background: value ? '#e91e63' : '#334155' }}>
        <div style={{ ...SF.toggleThumb, transform: value ? 'translateX(20px)' : 'translateX(0)' }} />
      </div>
    </div>
  )
}

const SF = {
  wrap: { marginBottom: '0' },
  labelWrap: { marginBottom: '8px' },
  label: { display: 'block', fontSize: '14px', fontWeight: 600, color: '#e2e8f0', marginBottom: '2px' },
  hint: { fontSize: '12px', color: '#475569' },
  inputRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  suffix: { color: '#64748b', fontSize: '13px', whiteSpace: 'nowrap' },
  toggleWrap: { display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 0', borderBottom: '1px solid #0f172a' },
  toggleLabel: { fontSize: '14px', color: '#e2e8f0', fontWeight: 500, marginBottom: '2px' },
  toggle: { width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 },
  toggleThumb: { position: 'absolute', top: '3px', left: '3px', width: '18px', height: '18px', background: '#fff', borderRadius: '50%', transition: 'transform 0.2s' },
}

const S = {
  page: { padding: '24px', maxWidth: '1000px', margin: '0 auto', color: '#f1f5f9' },
  center: { textAlign: 'center', padding: '80px', color: '#64748b' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { margin: '0 0 4px', fontSize: '24px', fontWeight: 700 },
  subtitle: { margin: 0, color: '#64748b', fontSize: '14px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  savedMsg: { color: '#4ade80', fontSize: '14px', fontWeight: 500 },
  btnSave: { background: '#e91e63', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', fontSize: '14px', fontWeight: 700 },
  tabs: { display: 'flex', gap: '4px', borderBottom: '1px solid #1e293b', marginBottom: '24px' },
  tab: { background: 'none', border: 'none', borderBottom: '2px solid transparent', color: '#64748b', cursor: 'pointer', padding: '10px 18px', fontSize: '14px', transition: 'all 0.15s' },
  tabActive: { color: '#e91e63', borderBottomColor: '#e91e63', fontWeight: 600 },
  card: { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '28px' },
  cardHeader: { marginBottom: '24px' },
  cardTitle: { margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: '#f1f5f9' },
  cardSub: { margin: 0, color: '#64748b', fontSize: '14px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' },
  numInput: { background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px', color: '#f1f5f9', fontSize: '16px', fontWeight: 600, width: '120px', outline: 'none' },
  select: { background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px', color: '#f1f5f9', fontSize: '14px', outline: 'none', width: '100%' },
  toggleSection: { borderTop: '1px solid #0f172a', paddingTop: '4px' },
  previewBox: { background: '#0f172a', border: '1px solid #e91e6333', borderRadius: '8px', padding: '16px', marginTop: '24px' },
  previewTitle: { color: '#e91e63', fontSize: '13px', fontWeight: 600, marginBottom: '8px' },
  previewText: { margin: 0, color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' },
  tiersGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' },
  tierCard: { background: '#0f172a', borderRadius: '10px', padding: '18px', border: '1px solid #334155' },
  tierHeader: { marginBottom: '16px' },
  tierName: { fontSize: '15px', fontWeight: 700, marginBottom: '2px' },
  tierDesc: { color: '#475569', fontSize: '12px' },
  tierFields: { display: 'flex', flexDirection: 'column', gap: '12px' },
  tierField: {},
  tierLabel: { display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  tierInputWrap: { display: 'flex', alignItems: 'center', gap: '6px' },
  tierInput: { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '8px 10px', color: '#f1f5f9', fontSize: '16px', fontWeight: 700, width: '70px', outline: 'none' },
  tierSuffix: { color: '#64748b', fontSize: '13px' },
  rateBar: { background: '#334155', borderRadius: '4px', height: '6px', marginTop: '12px', overflow: 'hidden' },
  rateBarFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s' },
  flowDiagram: { background: '#0f172a', borderRadius: '10px', padding: '20px', marginTop: '24px', border: '1px solid #334155' },
  flowTitle: { color: '#94a3b8', fontSize: '13px', fontWeight: 600, marginBottom: '16px' },
  flowSteps: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  flowStepWrap: { display: 'flex', alignItems: 'center', gap: '8px' },
  flowStep: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px 16px', textAlign: 'center', minWidth: '120px' },
  flowIcon: { fontSize: '20px', display: 'block', marginBottom: '6px' },
  flowLabel: { color: '#e2e8f0', fontSize: '12px', fontWeight: 600, marginBottom: '2px' },
  flowSub: { color: '#475569', fontSize: '11px' },
  flowArrow: { color: '#e91e63', fontSize: '20px', fontWeight: 700 },
}