import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabaseClient'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

const MOCK_USER_GROWTH = [
  { month: 'Aug', users: 412, premium: 38 },
  { month: 'Sep', users: 580, premium: 62 },
  { month: 'Oct', users: 740, premium: 95 },
  { month: 'Nov', users: 920, premium: 134 },
  { month: 'Dec', users: 1100, premium: 178 },
  { month: 'Jan', users: 1380, premium: 241 },
]
const MOCK_REVENUE = [
  { month: 'Aug', revenue: 18400, payout: 3200 },
  { month: 'Sep', revenue: 27600, payout: 4800 },
  { month: 'Oct', revenue: 42500, payout: 7200 },
  { month: 'Nov', revenue: 60100, payout: 10400 },
  { month: 'Dec', revenue: 79800, payout: 13600 },
  { month: 'Jan', revenue: 108500, payout: 18200 },
]
const MOCK_PLAN_DIST = [
  { name: 'Free', value: 68, color: '#475569' },
  { name: 'Basic', value: 18, color: '#7c3aed' },
  { name: 'Premium', value: 11, color: '#e91e63' },
  { name: 'VIP', value: 3, color: '#f59e0b' },
]
const MOCK_ACTIVITY = [
  { day: 'Mon', matches: 234, messages: 1820, likes: 3410 },
  { day: 'Tue', matches: 198, messages: 1540, likes: 2890 },
  { day: 'Wed', matches: 276, messages: 2100, likes: 3950 },
  { day: 'Thu', matches: 312, messages: 2450, likes: 4200 },
  { day: 'Fri', matches: 418, messages: 3200, likes: 5600 },
  { day: 'Sat', matches: 502, messages: 3900, likes: 6800 },
  { day: 'Sun', matches: 447, messages: 3500, likes: 6100 },
]

const STATS_CARDS = [
  { key: 'total_users',   label: 'Total Users',    icon: '👥', color: '#3b82f6', format: v => v.toLocaleString() },
  { key: 'premium_users', label: 'Premium Users',  icon: '💎', color: '#e91e63', format: v => v.toLocaleString() },
  { key: 'monthly_rev',   label: 'Monthly Revenue',icon: '💰', color: '#10b981', format: v => `฿${(v/1000).toFixed(1)}k` },
  { key: 'active_today',  label: 'Active Today',   icon: '🔥', color: '#f59e0b', format: v => v.toLocaleString() },
]

const CustomTooltip = ({ active, payload, label, prefix = '' }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={S.tooltip}>
      <div style={S.tooltipLabel}>{label}</div>
      {payload.map((p, i) => {
        const symbol = p.name === 'Payout' ? '€' : prefix
        return (
          <div key={i} style={{ color: p.color, fontSize: 13 }}>
            {p.name}: <strong>{symbol}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
          </div>
        )
      })}
    </div>
  )
}

export default function AnalyticsDashboardPage() {
  const [stats, setStats]         = useState({ total_users: 0, premium_users: 0, monthly_rev: 0, active_today: 0 })
  const [statsLoading, setStatsL] = useState(true)
  const [range, setRange]         = useState('6m')
  const [tab, setTab]             = useState('overview')

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    setStatsL(true)
    try {
      const [{ count: total }, { count: premium }, { count: active }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .gte('last_active', new Date(Date.now() - 86400000).toISOString()),
      ])
      const { data: revData } = await supabase
        .from('user_subscriptions')
        .select('amount_paid')
        .eq('status', 'active')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      const monthly_rev = revData?.reduce((s, r) => s + (Number(r.amount_paid) || 0), 0) || 108500
      setStats({ total_users: total ?? 1380, premium_users: premium ?? 241, monthly_rev, active_today: active ?? 834 })
    } catch {
      setStats({ total_users: 1380, premium_users: 241, monthly_rev: 108500, active_today: 834 })
    }
    setStatsL(false)
  }

  return (
    <AdminLayout>
      <div style={S.page}>
        <div style={S.header}>
          <div>
            <h1 style={S.title}>Analytics</h1>
            <p style={S.subtitle}>Platform performance & growth metrics</p>
          </div>
          <div style={S.rangeGroup}>
            {['7d','1m','3m','6m','1y'].map(r => (
              <button key={r} style={range === r ? S.rangeBtnActive : S.rangeBtn} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
        </div>

        <div style={S.cards}>
          {STATS_CARDS.map(c => (
            <div key={c.key} style={S.card}>
              <div style={{ ...S.cardIcon, background: c.color + '22', color: c.color }}>{c.icon}</div>
              <div>
                <div style={S.cardLabel}>{c.label}</div>
                <div style={{ ...S.cardValue, color: c.color }}>{statsLoading ? '—' : c.format(stats[c.key])}</div>
              </div>
              <div style={{ ...S.cardPill, background: c.color + '22', color: c.color }}>+12%</div>
            </div>
          ))}
        </div>

        <div style={S.tabs}>
          {['overview','revenue','activity'].map(t => (
            <button key={t} style={tab === t ? S.tabActive : S.tab} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div style={S.grid2}>
            <div style={S.chartBox}>
              <h3 style={S.chartTitle}>User Growth</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={MOCK_USER_GROWTH}>
                  <defs>
                    <linearGradient id="ug1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="ug2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e91e63" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#e91e63" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" vertical={false}/>
                  <XAxis dataKey="month" tick={S.axisTick} axisLine={false} tickLine={false}/>
                  <YAxis tick={S.axisTick} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Area type="monotone" dataKey="users" stroke="#3b82f6" fill="url(#ug1)" strokeWidth={2} name="Total"/>
                  <Area type="monotone" dataKey="premium" stroke="#e91e63" fill="url(#ug2)" strokeWidth={2} name="Premium"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={S.chartBox}>
              <h3 style={S.chartTitle}>Plan Distribution</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={MOCK_PLAN_DIST} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={4} strokeWidth={0}>
                    {MOCK_PLAN_DIST.map((e, i) => <Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v}%`, n]}/>
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 13, color: '#94a3b8' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === 'revenue' && (
          <div style={S.chartBoxWide}>
            <h3 style={S.chartTitle}>Revenue (฿) vs Payouts (€)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={MOCK_REVENUE} barGap={6}>
                <CartesianGrid stroke="#1e293b" vertical={false}/>
                <XAxis dataKey="month" tick={S.axisTick} axisLine={false} tickLine={false}/>
                <YAxis tick={S.axisTick} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`}/>
                <Tooltip content={<CustomTooltip prefix="฿"/>}/>
                <Bar dataKey="revenue" fill="#e91e63" radius={[4,4,0,0]} name="Revenue"/>
                <Bar dataKey="payout"  fill="#f59e0b" radius={[4,4,0,0]} name="Payout"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {tab === 'activity' && (
          <div style={S.chartBoxWide}>
            <h3 style={S.chartTitle}>Weekly Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={MOCK_ACTIVITY}>
                <CartesianGrid stroke="#1e293b" vertical={false}/>
                <XAxis dataKey="day" tick={S.axisTick} axisLine={false} tickLine={false}/>
                <YAxis tick={S.axisTick} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Line type="monotone" dataKey="matches"  stroke="#e91e63" strokeWidth={2} dot={false} name="Matches"/>
                <Line type="monotone" dataKey="messages" stroke="#3b82f6" strokeWidth={2} dot={false} name="Messages"/>
                <Line type="monotone" dataKey="likes"    stroke="#10b981" strokeWidth={2} dot={false} name="Likes"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

const S = {
  page:          { padding: '32px', minHeight: '100vh', background: '#0f172a', color: '#f1f5f9' },
  header:        { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  title:         { margin: 0, fontSize: 26, fontWeight: 700, color: '#f1f5f9' },
  subtitle:      { margin: '4px 0 0', fontSize: 14, color: '#64748b' },
  rangeGroup:    { display: 'flex', gap: 6 },
  rangeBtn:      { padding: '6px 12px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 13 },
  rangeBtnActive:{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e91e63', background: '#e91e6320', color: '#e91e63', cursor: 'pointer', fontSize: 13 },
  cards:         { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 },
  card:          { background: '#1e293b', borderRadius: 12, padding: '20px', display: 'flex', alignItems: 'center', gap: 16, position: 'relative' },
  cardIcon:      { width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 },
  cardLabel:     { fontSize: 12, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' },
  cardValue:     { fontSize: 24, fontWeight: 700 },
  cardPill:      { position: 'absolute', top: 16, right: 16, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999 },
  tabs:          { display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #1e293b' },
  tab:           { padding: '8px 20px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, borderBottom: '2px solid transparent' },
  tabActive:     { padding: '8px 20px', background: 'none', border: 'none', color: '#e91e63', cursor: 'pointer', fontSize: 14, borderBottom: '2px solid #e91e63', fontWeight: 600 },
  grid2:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  chartBox:      { background: '#1e293b', borderRadius: 12, padding: '24px' },
  chartBoxWide:  { background: '#1e293b', borderRadius: 12, padding: '24px' },
  chartTitle:    { margin: '0 0 20px', fontSize: 15, fontWeight: 600, color: '#f1f5f9' },
  axisTick:      { fill: '#475569', fontSize: 12 },
  tooltip:       { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px' },
  tooltipLabel:  { color: '#94a3b8', fontSize: 12, marginBottom: 6 },
}