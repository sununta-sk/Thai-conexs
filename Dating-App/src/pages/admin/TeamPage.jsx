// src/pages/admin/TeamPage.jsx
import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabaseClient'

export default function TeamPage() {
  const [members, setMembers] = useState([])
  const [roles, setRoles]     = useState([])
  const [loading, setLoad]    = useState(true)
  const [toast, setToast]     = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [newEmail, setNewEmail]   = useState('')
  const [newRole, setNewRole]     = useState('')
  const [newDisplay, setNewDisplay] = useState('')
  const [adding, setAdding]       = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoad(true)
    try {
      const [{ data: m }, { data: r }] = await Promise.all([
        supabase.from('admin_users').select('*, admin_roles(name,display_name)').order('created_at'),
        supabase.from('admin_roles').select('*'),
      ])
      setMembers(m||[]); setRoles(r||[])
      if (r && r.length > 0) setNewRole(r[0].id)
    } catch(e) { console.error(e) }
    setLoad(false)
  }

  async function handleAddAdmin(e) {
    e.preventDefault()
    if (!newEmail || !newRole) return
    setAdding(true)
    try {
      // ค้นหา auth_user_id จาก email ใน profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newEmail.trim().toLowerCase())
        .maybeSingle()

      if (!profile) {
        showT('ไม่พบ email นี้ในระบบ — user ต้องสมัครก่อน', 'error')
        setAdding(false)
        return
      }

      // เช็คว่าเป็น admin อยู่แล้วไหม
      const { data: existing } = await supabase
        .from('admin_users')
        .select('id')
        .eq('auth_user_id', profile.id)
        .maybeSingle()

      if (existing) {
        showT('Email นี้เป็น Admin อยู่แล้ว', 'error')
        setAdding(false)
        return
      }

      const { error } = await supabase.from('admin_users').insert({
        auth_user_id: profile.id,
        email: newEmail.trim().toLowerCase(),
        display_name: newDisplay.trim() || newEmail.split('@')[0],
        role_id: newRole,
        is_active: true,
      })

      if (error) throw error

      showT('เพิ่ม Admin สำเร็จ ✓')
      setShowModal(false)
      setNewEmail(''); setNewDisplay(''); 
      if (roles.length > 0) setNewRole(roles[0].id)
      await fetchAll()
    } catch(err) {
      showT(err.message || 'เกิดข้อผิดพลาด', 'error')
    }
    setAdding(false)
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
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={S.stat}>{members.filter(m=>m.is_active).length} active admins</div>
            <button onClick={() => setShowModal(true)} style={S.btnAdd}>+ Add Admin</button>
          </div>
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
          {loading ? <div style={S.empty}>กำลังโหลด...</div>
          : members.length===0 ? <div style={S.empty}>ไม่มีสมาชิกทีม</div>
          : (
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

      {/* ── Add Admin Modal ── */}
      {showModal && (
        <div style={S.overlay} onClick={() => setShowModal(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h3 style={S.modalTitle}>+ Add Admin</h3>
            <p style={S.modalSub}>User ต้องสมัครบัญชีก่อน แล้วค่อยเพิ่มเป็น Admin</p>
            <form onSubmit={handleAddAdmin} style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label style={S.label}>Email *</label>
                <input
                  type="email" required
                  placeholder="user@email.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  style={S.input}
                />
              </div>
              <div>
                <label style={S.label}>Display Name</label>
                <input
                  type="text"
                  placeholder="ชื่อที่แสดงใน Admin portal"
                  value={newDisplay}
                  onChange={e => setNewDisplay(e.target.value)}
                  style={S.input}
                />
              </div>
              <div>
                <label style={S.label}>Role *</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)} style={S.input}>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.display_name || r.name}</option>
                  ))}
                </select>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:4}}>
                <button type="button" onClick={() => setShowModal(false)} style={S.btnCancel}>Cancel</button>
                <button type="submit" disabled={adding} style={{...S.btnConfirm, opacity: adding ? 0.7 : 1}}>
                  {adding ? 'Adding…' : 'Add Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

const S = {
  page:{padding:24},
  hdr:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24},
  title:{color:'#f1f5f9',fontSize:22,fontWeight:800,margin:'0 0 4px'},
  sub:{color:'#64748b',fontSize:13,margin:0},
  stat:{background:'#1e293b',border:'1px solid #334155',borderRadius:20,padding:'6px 14px',color:'#94a3b8',fontSize:13},
  btnAdd:{background:'#e91e63',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:'pointer'},
  rolesRow:{display:'flex',gap:12,marginBottom:24},
  roleCard:{flex:1,background:'#1e293b',borderRadius:12,padding:'16px 20px',border:'1px solid #334155'},
  card:{background:'#1e293b',borderRadius:16,border:'1px solid #334155',overflow:'hidden'},
  table:{width:'100%',borderCollapse:'collapse'},
  th:{padding:'12px 16px',textAlign:'left',color:'#475569',fontSize:10,fontWeight:700,textTransform:'uppercase',borderBottom:'1px solid #334155'},
  tr:{borderBottom:'1px solid #0f172a'},
  td:{padding:'12px 16px',color:'#94a3b8',fontSize:13},
  roleBadge:{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5},
  statusBadge:{padding:'3px 8px',borderRadius:20,fontSize:10,fontWeight:700},
  actionBtn:{background:'transparent',border:'1px solid',borderRadius:6,padding:'5px 10px',fontSize:11,cursor:'pointer',fontWeight:600},
  empty:{padding:40,textAlign:'center',color:'#475569'},
  toast:{position:'fixed',bottom:32,right:32,color:'#fff',padding:'12px 22px',borderRadius:10,fontWeight:700,zIndex:999},
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000},
  modal:{background:'#1e293b',border:'1px solid #334155',borderRadius:16,padding:28,width:420,maxWidth:'90vw'},
  modalTitle:{color:'#f1f5f9',fontSize:18,fontWeight:800,margin:'0 0 6px'},
  modalSub:{color:'#64748b',fontSize:13,margin:'0 0 20px'},
  label:{display:'block',fontSize:12,color:'#64748b',fontWeight:700,marginBottom:6,textTransform:'uppercase'},
  input:{width:'100%',background:'#0f172a',border:'1px solid #334155',borderRadius:8,padding:'10px 12px',color:'#f1f5f9',fontSize:14,outline:'none',boxSizing:'border-box'},
  btnCancel:{background:'none',border:'1px solid #334155',color:'#94a3b8',borderRadius:8,padding:'9px 18px',cursor:'pointer',fontSize:14},
  btnConfirm:{background:'#e91e63',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',cursor:'pointer',fontSize:14,fontWeight:700},
}