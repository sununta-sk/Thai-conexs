// src/pages/admin/RevenuePage.jsx
import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabaseClient'

export default function RevenuePage() {
  const [subs, setSubs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats]     = useState({ total: 0, monthly: 0, active: 0 })

  useEffect(() => { fetchRevenue() }, [])

  async function fetchRevenue() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('*, profiles(full_name, email), subscription_plans(display_name, price)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (data) {
        setSubs(data)
        const total   = data.reduce((s, r) => s + (Number(r.amount_paid) || 0), 0)
        const monthly = data.filter(r => new Date(r.created_at) > new Date(Date.now() - 30*86400000))
                            .reduce((s, r) => s + (Number(r.amount_paid) || 0), 0)
        setStats({ total, monthly, active: data.filter(r => r.status === 'active').length })
      }
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const statusColor = { active:'#10b981', expired:'#ef4444', cancelled:'#f59e0b' }

  return (
    <AdminLayout>
      <div style={S.page}>
        <div style={S.hdr}>
          <div>
            <h2 style={S.title}>💰 Revenue</h2>
            <p style={S.sub}>ประวัติ subscription และการชำระเงิน</p>
          </div>
          <button onClick={fetchRevenue} style={S.btn}>🔄 Refresh</button>
        </div>
        <div style={S.kpiRow}>
          {[
            { label:'Total Revenue',      value:`$${stats.total.toLocaleString()}`,   color:'#10b981' },
            { label:'This Month',         value:`$${stats.monthly.toLocaleString()}`, color:'#3b82f6' },
            { label:'Active Subscribers', value:stats.active,                          color:'#8b5cf6' },
          ].map(k => (
            <div key={k.label} style={{...S.kpiCard, borderTop:`3px solid ${k.color}`}}>
              <div style={{...S.kpiVal, color:k.color}}>{k.value}</div>
              <div style={S.kpiLbl}>{k.label}</div>
            </div>
          ))}
        </div>
        <div style={S.card}>
          {loading ? <div style={S.empty}>กำลังโหลด...</div>
          : subs.length === 0 ? <div style={S.empty}>ยังไม่มีข้อมูล subscription</div>
          : (
            <table style={S.table}>
              <thead><tr>{['User','Plan','Amount','Status','Expires'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {subs.map(s => (
                  <tr key={s.id} style={S.tr}>
                    <td style={S.td}>
                      <div style={{color:'#f1f5f9',fontWeight:700}}>{s.profiles?.full_name ?? '—'}</div>
                      <div style={{fontSize:11,color:'#64748b'}}>{s.profiles?.email}</div>
                    </td>
                    <td style={S.td}>{s.subscription_plans?.display_name ?? s.plan_id ?? '—'}</td>
                    <td style={{...S.td,color:'#10b981',fontWeight:700}}>${Number(s.amount_paid||0).toLocaleString()}</td>
                    <td style={S.td}><span style={{...S.badge,background:`${statusColor[s.status]??'#475569'}22`,color:statusColor[s.status]??'#475569'}}>{s.status}</span></td>
                    <td style={S.td}>{s.end_date ? new Date(s.end_date).toLocaleDateString('th-TH') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

const S = {
  page:{padding:24}, hdr:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24},
  title:{color:'#f1f5f9',fontSize:22,fontWeight:800,margin:'0 0 4px'}, sub:{color:'#64748b',fontSize:13,margin:0},
  btn:{background:'#1e293b',border:'1px solid #334155',borderRadius:10,padding:'8px 16px',color:'#94a3b8',fontSize:13,fontWeight:600,cursor:'pointer'},
  kpiRow:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24},
  kpiCard:{background:'#1e293b',borderRadius:14,padding:20,border:'1px solid #334155'},
  kpiVal:{fontSize:26,fontWeight:800,marginBottom:4}, kpiLbl:{color:'#64748b',fontSize:12,fontWeight:600},
  card:{background:'#1e293b',borderRadius:16,border:'1px solid #334155',overflow:'hidden'},
  table:{width:'100%',borderCollapse:'collapse'},
  th:{padding:'12px 16px',textAlign:'left',color:'#475569',fontSize:10,fontWeight:700,textTransform:'uppercase',borderBottom:'1px solid #334155'},
  tr:{borderBottom:'1px solid #0f172a'}, td:{padding:'12px 16px',color:'#94a3b8',fontSize:13},
  badge:{padding:'3px 8px',borderRadius:20,fontSize:10,fontWeight:700,textTransform:'uppercase'},
  empty:{padding:40,textAlign:'center',color:'#475569'},
}