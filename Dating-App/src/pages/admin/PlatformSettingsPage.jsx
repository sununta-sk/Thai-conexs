// src/pages/admin/PlatformSettingsPage.jsx
import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabaseClient'

const DEFAULTS = [
  { key:'app_name',             label:'App Name',                     value:'Thai Conexns', type:'text',   group:'General' },
  { key:'maintenance_mode',     label:'Maintenance Mode',             value:false,           type:'toggle', group:'General' },
  { key:'registration_enabled', label:'Allow New Registrations',      value:true,            type:'toggle', group:'General' },
  { key:'max_free_likes',       label:'Free Likes Per Day',           value:'5',             type:'number', group:'Limits' },
  { key:'max_messages_free',    label:'Free Messages Per Day',        value:'10',            type:'number', group:'Limits' },
  { key:'photo_auto_approve',   label:'Auto-Approve Photos',          value:false,           type:'toggle', group:'Moderation' },
  { key:'report_threshold',     label:'Auto-suspend After N Reports', value:'5',             type:'number', group:'Moderation' },
  { key:'support_email',        label:'Support Email',                value:'support@thaiconexns.com', type:'text', group:'Contact' },
]

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState(null)
  const [dirty, setDirty]       = useState(false)

  useEffect(() => { fetchSettings() }, [])

  async function fetchSettings() {
    try {
      const { data } = await supabase.from('platform_settings').select('*')
      if (data?.length) setSettings(prev => prev.map(s => { const r = data.find(d=>d.key===s.key); return r?{...s,value:r.value}:s }))
    } catch {}
  }

  function update(key, value) { setSettings(prev => prev.map(s => s.key===key?{...s,value}:s)); setDirty(true) }

  async function saveAll() {
    setSaving(true)
    try {
      await Promise.all(settings.map(s => supabase.from('platform_settings').upsert({ key:s.key, value:String(s.value), updated_at:new Date().toISOString() })))
      setToast('✓ Settings saved'); setDirty(false)
    } catch { setToast('Error saving') }
    setSaving(false); setTimeout(()=>setToast(null),2500)
  }

  const groups = [...new Set(settings.map(s=>s.group))]

  return (
    <AdminLayout>
      <div style={S.page}>
        {toast && <div style={S.toast}>{toast}</div>}
        <div style={S.hdr}>
          <div><h2 style={S.title}>⚙️ Platform Settings</h2><p style={S.sub}>Configure app behavior</p></div>
          <button onClick={saveAll} disabled={!dirty||saving} style={{...S.saveBtn,opacity:dirty?1:0.4}}>{saving?'Saving…':'💾 Save Changes'}</button>
        </div>
        {groups.map(group => (
          <div key={group} style={S.groupCard}>
            <div style={S.groupTitle}>{group}</div>
            {settings.filter(s=>s.group===group).map(s => (
              <div key={s.key} style={S.row}>
                <div><div style={S.lbl}>{s.label}</div><code style={S.key}>{s.key}</code></div>
                {s.type==='toggle' ? (
                  <button onClick={()=>update(s.key,!s.value)} style={{...S.toggle,background:s.value?'#e91e63':'#334155'}}>
                    <div style={{...S.knob,transform:s.value?'translateX(20px)':'translateX(2px)'}}/>
                  </button>
                ) : (
                  <input type={s.type==='number'?'number':'text'} value={s.value} onChange={e=>update(s.key,e.target.value)} style={S.input}/>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}

const S = {
  page:{padding:24}, hdr:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24},
  title:{color:'#f1f5f9',fontSize:22,fontWeight:800,margin:'0 0 4px'}, sub:{color:'#64748b',fontSize:13,margin:0},
  saveBtn:{background:'#e91e63',border:'none',borderRadius:10,padding:'10px 20px',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'},
  groupCard:{background:'#1e293b',borderRadius:14,border:'1px solid #334155',overflow:'hidden',marginBottom:16},
  groupTitle:{padding:'12px 20px',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#475569',borderBottom:'1px solid #334155',background:'#0f172a'},
  row:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid #0f172a'},
  lbl:{color:'#e2e8f0',fontSize:14,fontWeight:600,marginBottom:2}, key:{fontSize:11,color:'#475569',fontFamily:'monospace'},
  toggle:{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0},
  knob:{position:'absolute',top:2,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'transform 0.2s'},
  input:{background:'#0f172a',border:'1px solid #334155',borderRadius:8,padding:'8px 12px',color:'#f1f5f9',fontSize:13,width:200,textAlign:'right'},
  toast:{position:'fixed',bottom:32,right:32,background:'#10b981',color:'#fff',padding:'12px 22px',borderRadius:10,fontWeight:700,zIndex:999},
}