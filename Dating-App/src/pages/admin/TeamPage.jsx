// src/pages/admin/TeamPage.jsx
import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabaseClient'

export default function TeamPage() {
  const [members, setMembers] = useState([])
  const [roles, setRoles]     = useState([])
  const [loading, setLoad]    = useState(true)
  const [toast, setToast]     = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoad(true)
    try {
      const [{ data: m }, { data: r }] = await Promise.all([
        supabase.from('admin_users').select('*, admin_roles(name,display_name)').order('created_at'),
        supabase.from('admin_roles').select('*'),
      ])
      setMembers(m||[]); setRoles(r||[])
    } catch(e) { console.error(e) }
    setLoad(false)
  }

  async function toggleActive(m) {
    try {
      await supabase.from('admin_users').update({is_active:!m.is_active}).eq('id',m.id)
      setMembers(prev=>prev.map(a=>a.id===m.id?{...a,is_active:!a.is_active}:a))
      showT(m.is_active?'Admin suspended':'Admin activated')
    } catch { showT('Error','error') }
  }

  function showT(msg,type='success') { setToast({msg,type}); setTimeout(()=>setToast(null),2500) }
  const roleColors = { super_admin:'#e91e63', content_moderator:'#3b82f6', affiliate_manager:'#8b5cf6', finance_viewer:'#10b981' }

  return (
    <AdminLayout>
      <div style={S.page}>
        {toast && <div style={{...S.toast,background:toast.type==='error'?'#ef4444':'#10b981'}}>{toast.msg}</div>}
        <div style={S.hdr}>
          <div><h2 style={S.title}>👤 Team</h2><p style={S.sub}>จัดการ Admin accounts และสิทธิ์</p></div>
          <div style={S.stat}>{members.filter(m=>m.is_active).length} active admins</div>
        </div>
        <div style={S.rolesRow}>
          {roles.map(r=>{ const c=roleColors[r.name]||'#475569'; return (
            <div key={r.id} style={{...S.roleCard,borderTop:`3px solid ${c}`}}>
              <div style={{color:c,fontSize:20,fontWeight:800}}>{members.filter(m=>m.role_id===r.id).length}</div>
              <div style={{color:'#94a3b8',fontSize:12,marginTop:4}}>{r.display_name||r.name}</div>
            </div>
          )})}
        </div>
        <div style={S.card}>
          {loading?<div style={S.empty}>กำลังโหลด...</div>
          :members.length===0?<div style={S.empty}>ไม่มีสมาชิกทีม</div>
          :(
            <table style={S.table}>
              <thead><tr>{['Admin','Role','Last Login','Status','Action'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {members.map(m=>{ const c=roleColors[m.admin_roles?.name]||'#475569'; return (
                  <tr key={m.id} style={{...S.tr,opacity:m.is_active?1:0.5}}>
                    <td style={S.td}><div style={{color:'#f1f5f9',fontWeight:700}}>{m.display_name}</div><div style={{fontSize:11,color:'#64748b'}}>{m.email}</div></td>
                    <td style={S.td}><span style={{...S.roleBadge,background:`${c}22`,color:c,border:`1px solid ${c}44`}}>{m.admin_roles?.display_name||m.admin_roles?.name}</span></td>
                    <td style={S.td}>{m.last_login_at?new Date(m.last_login_at).toLocaleString('th-TH'):'Never'}</td>
                    <td style={S.td}><span style={{...S.statusBadge,background:m.is_active?'#10b98122':'#ef444422',color:m.is_active?'#10b981':'#ef4444'}}>{m.is_active?'Active':'Suspended'}</span></td>
                    <td style={S.td}><button onClick={()=>toggleActive(m)} style={{...S.actionBtn,color:m.is_active?'#ef4444':'#10b981',borderColor:m.is_active?'#ef444444':'#10b98144'}}>{m.is_active?'Suspend':'Activate'}</button></td>
                  </tr>
                )})}
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
  stat:{background:'#1e293b',border:'1px solid #334155',borderRadius:20,padding:'6px 14px',color:'#94a3b8',fontSize:13},
  rolesRow:{display:'flex',gap:12,marginBottom:24},
  roleCard:{flex:1,background:'#1e293b',borderRadius:12,padding:'16px 20px',border:'1px solid #334155'},
  card:{background:'#1e293b',borderRadius:16,border:'1px solid #334155',overflow:'hidden'},
  table:{width:'100%',borderCollapse:'collapse'},
  th:{padding:'12px 16px',textAlign:'left',color:'#475569',fontSize:10,fontWeight:700,textTransform:'uppercase',borderBottom:'1px solid #334155'},
  tr:{borderBottom:'1px solid #0f172a'}, td:{padding:'12px 16px',color:'#94a3b8',fontSize:13},
  roleBadge:{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5},
  statusBadge:{padding:'3px 8px',borderRadius:20,fontSize:10,fontWeight:700},
  actionBtn:{background:'transparent',border:'1px solid',borderRadius:6,padding:'5px 10px',fontSize:11,cursor:'pointer',fontWeight:600},
  empty:{padding:40,textAlign:'center',color:'#475569'},
  toast:{position:'fixed',bottom:32,right:32,color:'#fff',padding:'12px 22px',borderRadius:10,fontWeight:700,zIndex:999},
}