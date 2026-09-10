// src/pages/LotusPage.jsx
// Lotus wallet page (Phase 5) - replaces the "coming soon" stub linked from
// ProfilePage.jsx's "🪷 Get more lotus" CTA. Schema/RPCs already live:
//   - profiles.lotus_balance, lotus_purchase_packs, lotus_boost_prices
//   - api/lotus/checkout.ts (Stripe Checkout Session for a purchase pack)
//   - activate_boost_with_lotus(p_user_id, p_duration_days) RPC (spends
//     lotus_balance directly, no Stripe involved) - same call pattern as
//     useLoginBonus.js's claim_daily_login_lotus, the only other lotus RPC
//     this app already calls from the client.
//
// Pack/tier prices are never hardcoded here - both tables are the source
// of truth (lotus_purchase_packs.stripe_price_id is nullable, so a pack
// missing its Stripe Price ID renders but stays disabled instead of
// producing a checkout.ts 503 the user can't make sense of).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useIsMobile } from '../hooks/useIsMobile'
import { useTranslation } from '../hooks/useTranslation'

export default function LotusPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { tx } = useTranslation(['lotusPage'])

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [packs, setPacks] = useState([])
  const [boostTiers, setBoostTiers] = useState([])

  // base_lotus of the pack currently mid-checkout, or null - also doubles
  // as an "any purchase in flight" lock across every pack button, same as
  // duration_days below does for boost tiers.
  const [purchasingPack, setPurchasingPack] = useState(null)
  const [activatingTier, setActivatingTier] = useState(null)
  const [toast, setToast] = useState(null) // { status: 'error' | 'success', text }

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { navigate('/login'); return }
      if (cancelled) return
      setUser(u)

      const [{ data: profile, error: profileErr }, { data: packsData, error: packsErr }, { data: tiersData, error: tiersErr }] = await Promise.all([
        supabase.from('profiles').select('lotus_balance').eq('id', u.id).single(),
        supabase.from('lotus_purchase_packs').select('base_lotus, total_lotus, price_thb, stripe_price_id').order('base_lotus', { ascending: true }),
        supabase.from('lotus_boost_prices').select('duration_days, lotus_cost').order('duration_days', { ascending: true }),
      ])
      if (cancelled) return

      if (profileErr) console.error('[LotusPage] load profile failed:', profileErr.message)
      if (packsErr) console.error('[LotusPage] load purchase packs failed:', packsErr.message)
      if (tiersErr) console.error('[LotusPage] load boost prices failed:', tiersErr.message)

      setBalance(profile?.lotus_balance ?? 0)
      setPacks(packsData || [])
      setBoostTiers(tiersData || [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [navigate])

  function showToast(status, text) {
    setToast({ status, text })
    setTimeout(() => setToast(t => (t?.text === text ? null : t)), 4000)
  }

  async function handlePurchase(pack) {
    if (!pack.stripe_price_id || purchasingPack !== null) return
    setPurchasingPack(pack.base_lotus)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }

      const res = await fetch('/api/lotus/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ baseLotus: pack.base_lotus }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.checkoutUrl) {
        const msg =
          data.error === 'pack_not_configured' ? (tx.errPackNotConfigured || 'This pack is not available for purchase right now.') :
          data.error === 'invalid_pack' ? (tx.errInvalidPack || 'Invalid option selected.') :
          res.status === 401 ? (tx.errUnauthorized || 'Please log in again.') :
          (tx.errGeneric || 'Something went wrong, please try again.')
        showToast('error', msg)
        setPurchasingPack(null)
        return
      }

      // Full-page redirect, not window.open/target=_blank - a new tab
      // doesn't survive the Capacitor WebView on mobile builds.
      window.location.href = data.checkoutUrl
    } catch {
      showToast('error', tx.errGeneric || 'Something went wrong, please try again.')
      setPurchasingPack(null)
    }
  }

  async function handleBoost(tier) {
    if (!user || activatingTier !== null || balance < tier.lotus_cost) return
    setActivatingTier(tier.duration_days)
    try {
      const { data, error } = await supabase.rpc('activate_boost_with_lotus', {
        p_user_id: user.id,
        p_duration_days: tier.duration_days,
      })

      if (error) {
        showToast('error', tx.errGeneric || 'Something went wrong, please try again.')
        return
      }
      if (data?.error) {
        const msg =
          data.error === 'insufficient_balance' ? (tx.errInsufficientBalance || 'You do not have enough lotus for this.') :
          data.error === 'boost_already_active' ? (tx.errBoostActive || 'A boost is already active on your profile.') :
          data.error === 'invalid_duration' ? (tx.errInvalidPack || 'Invalid option selected.') :
          (tx.errGeneric || 'Something went wrong, please try again.')
        showToast('error', msg)
        return
      }

      setBalance(data.balance)
      showToast('success', tx.boostActivated || 'Boost activated! 🚀')
    } catch {
      showToast('error', tx.errGeneric || 'Something went wrong, please try again.')
    } finally {
      setActivatingTier(null)
    }
  }

  if (loading) {
    return (
      <div style={S.loadWrap}>
        <div style={S.spinner} />
      </div>
    )
  }

  return (
    <div style={{ ...S.page, paddingTop: isMobile ? 0 : 90 }}>
      <div style={S.container}>

        <button style={S.backBtn} onClick={() => navigate('/profile')}>{tx.back || '← Back'}</button>

        {/* ── Balance ── */}
        <div style={S.balanceCard}>
          <span style={S.balanceEmoji}>🪷</span>
          <div>
            <p style={S.balanceLabel}>{tx.yourBalance || 'Your lotus balance'}</p>
            <p style={S.balanceValue}>{balance.toLocaleString()}</p>
          </div>
        </div>

        {/* ── Purchase packs ── */}
        <h2 style={S.sectionTitle}>{tx.buyLotus || 'Buy lotus'}</h2>
        <div style={S.packGrid}>
          {packs.map(pack => {
            const unavailable = !pack.stripe_price_id
            const disabled = unavailable || purchasingPack !== null
            const isBusy = purchasingPack === pack.base_lotus
            return (
              <button
                key={pack.base_lotus}
                style={{ ...S.packCard, ...(disabled ? S.cardDisabled : {}) }}
                onClick={() => handlePurchase(pack)}
                disabled={disabled}
              >
                <span style={S.packTotal}>🪷 {pack.total_lotus.toLocaleString()}</span>
                {pack.total_lotus > pack.base_lotus && (
                  <span style={S.packBonus}>+{(pack.total_lotus - pack.base_lotus).toLocaleString()} {tx.bonus || 'bonus'}</span>
                )}
                <span style={S.packPrice}>
                  {isBusy ? <span style={S.spinnerSm} /> : `฿${Number(pack.price_thb).toLocaleString()}`}
                </span>
                {unavailable && <span style={S.unavailableTag}>{tx.unavailable || 'Not available yet'}</span>}
              </button>
            )
          })}
        </div>

        {/* ── Boost with lotus ── */}
        <h2 style={S.sectionTitle}>{tx.boostWithLotus || 'Boost with lotus'}</h2>
        <div style={S.tierGrid}>
          {boostTiers.map(tier => {
            const affordable = balance >= tier.lotus_cost
            const disabled = !affordable || activatingTier !== null
            const isBusy = activatingTier === tier.duration_days
            return (
              <button
                key={tier.duration_days}
                style={{ ...S.tierCard, ...(disabled ? S.cardDisabled : {}) }}
                onClick={() => handleBoost(tier)}
                disabled={disabled}
              >
                <span style={S.tierDuration}>
                  {tier.duration_days} {tier.duration_days === 1 ? (tx.day || 'day') : (tx.days || 'days')}
                </span>
                <span style={S.tierCost}>
                  {isBusy ? <span style={S.spinnerSm} /> : `🪷 ${tier.lotus_cost.toLocaleString()}`}
                </span>
              </button>
            )
          })}
        </div>

      </div>

      {toast && (
        <div style={{
          ...S.toast,
          background: toast.status === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(74,222,128,0.15)',
          border: `1px solid ${toast.status === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(74,222,128,0.4)'}`,
          color: toast.status === 'error' ? '#f87171' : '#4ade80',
        }}>
          {toast.text}
        </div>
      )}
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────
const S = {
  page: {
    background: '#0f172a',
    color: '#f1f5f9',
    minHeight: '100vh',
    paddingBottom: 60,
  },
  loadWrap: {
    minHeight: '100vh',
    background: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid rgba(233,30,99,0.2)',
    borderTopColor: '#e91e63',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  spinnerSm: {
    display: 'inline-block',
    width: 16,
    height: 16,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },

  container: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '20px 20px 0',
  },

  backBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '4px 0',
    marginBottom: 8,
  },

  // Balance card
  balanceCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    background: 'linear-gradient(135deg, rgba(233,30,99,0.15), rgba(156,39,176,0.1))',
    border: '1px solid rgba(233,30,99,0.3)',
    borderRadius: 20,
    padding: '20px 24px',
    margin: '12px 0 28px',
  },
  balanceEmoji: { fontSize: 40 },
  balanceLabel: { margin: '0 0 4px', fontSize: 13, color: '#94a3b8' },
  balanceValue: { margin: 0, fontSize: 30, fontWeight: 800, color: '#f1f5f9' },

  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '1.2px',
    margin: '0 0 12px',
  },

  // Purchase packs
  packGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: 12,
    marginBottom: 32,
  },
  packCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    background: '#1e293b',
    border: '1.5px solid rgba(233,30,99,0.25)',
    borderRadius: 16,
    padding: '18px 10px',
    cursor: 'pointer',
    color: '#f1f5f9',
  },
  packTotal: { fontSize: 16, fontWeight: 800 },
  packBonus: {
    fontSize: 11,
    fontWeight: 700,
    color: '#4ade80',
    background: 'rgba(74,222,128,0.12)',
    borderRadius: 99,
    padding: '2px 8px',
  },
  packPrice: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: 700,
    color: '#e91e63',
    minHeight: 20,
    display: 'flex',
    alignItems: 'center',
  },
  unavailableTag: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },

  // Boost tiers
  tierGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: 12,
    marginBottom: 12,
  },
  tierCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    background: '#1e293b',
    border: '1.5px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: '18px 10px',
    cursor: 'pointer',
    color: '#f1f5f9',
  },
  tierDuration: { fontSize: 14, fontWeight: 700 },
  tierCost: {
    fontSize: 14,
    fontWeight: 700,
    color: '#cbd5e1',
    minHeight: 20,
    display: 'flex',
    alignItems: 'center',
  },

  cardDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },

  // Toast (same fixed-bottom-pill pattern as ProfileSetup.jsx's saveToast)
  toast: {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '14px 28px',
    borderRadius: 16,
    fontSize: 14,
    fontWeight: 700,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    zIndex: 3000,
    textAlign: 'center',
    maxWidth: '90vw',
  },
}
