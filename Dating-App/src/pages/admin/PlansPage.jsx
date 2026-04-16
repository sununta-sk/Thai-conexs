// src/pages/admin/PlansPage.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/AdminLayout';

export default function PlansPage() {
  const [plans, setPlans]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);

  useEffect(() => { fetchPlans() }, []);

  async function fetchPlans() {
    setLoading(true);
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price_monthly', { ascending: true });
    setPlans(data || []);
    setLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from('subscription_plans')
      .update({
        display_name:  editing.display_name,
        price_monthly: parseFloat(editing.price_monthly) || 0,
        price_yearly:  parseFloat(editing.price_yearly)  || 0,
        trial_days:    parseInt(editing.trial_days)       || 0,
        is_active:     editing.is_active,
      })
      .eq('id', editing.id);
    setSaving(false);
    if (error) { showT('Error: ' + error.message, 'error'); return; }
    showT('บันทึกสำเร็จ ✓');
    setEditing(null);
    fetchPlans();
  }

  async function toggleActive(plan) {
    await supabase.from('subscription_plans').update({ is_active: !plan.is_active }).eq('id', plan.id);
    setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: !p.is_active } : p));
    showT(plan.is_active ? 'Plan deactivated' : 'Plan activated');
  }

  function showT(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); }

  const COLOR = { free: '#64748b', gold: '#f59e0b', platinum: '#8b5cf6' };

  return (
    <AdminLayout>
      <div style={{ padding: 24 }}>
        {toast && <div style={{ position: 'fixed', bottom: 32, right: 32, background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', padding: '12px 22px', borderRadius: 10, fontWeight: 700, zIndex: 999 }}>{toast.msg}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>🎫 Subscription Plans</h2>
            <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>All subscription plans</p>
          </div>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 20, padding: '6px 14px', color: '#94a3b8', fontSize: 13 }}>
            {plans.filter(p => p.is_active).length} active plans
          </div>
        </div>

        {loading ? (
          <div style={{ color: '#475569', textAlign: 'center', padding: 60 }}>Loading...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {plans.map(plan => {
              const key   = plan.name?.toLowerCase();
              const color = COLOR[key] || '#64748b';
              return (
                <div key={plan.id} style={{ background: '#1e293b', border: `1px solid ${color}44`, borderRadius: 16, padding: 24, opacity: plan.is_active ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
                      <h3 style={{ color, fontSize: 18, fontWeight: 800, margin: 0 }}>{plan.display_name || plan.name}</h3>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: plan.is_active ? '#10b98122' : '#ef444422', color: plan.is_active ? '#10b981' : '#ef4444' }}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    <Row label="Monthly Price" value={plan.price_monthly ? `฿${plan.price_monthly}` : 'ฟรี'} color={color} />
                    <Row label="Yearly Price"    value={plan.price_yearly  ? `฿${plan.price_yearly}`  : 'ฟรี'} color={color} />
                    {plan.trial_days > 0 && <Row label="Trial" value={`${plan.trial_days} days`} color={color} />}
                    <Row label="Status" value={plan.is_active ? '✅ Active' : '❌ Inactive'} color={color} />
                    {plan.description && (
                      <div style={{ marginTop: 4, padding: '10px 12px', background: '#0f172a', borderRadius: 8 }}>
                        <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>{plan.description}</p>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditing({ ...plan })} style={{ flex: 1, background: '#e91e6322', color: '#e91e63', border: '1px solid #e91e6344', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      ✏️ Edit
                    </button>
                    <button onClick={() => toggleActive(plan)} style={{ flex: 1, background: 'transparent', border: `1px solid ${plan.is_active ? '#ef444444' : '#10b98144'}`, color: plan.is_active ? '#ef4444' : '#10b981', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {plan.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditing(null)}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 28, width: 440, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 800, margin: '0 0 20px' }}>✏️ Edit: {editing.display_name || editing.name}</h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={S.label}>Display Name</label>
                <input value={editing.display_name || ''} onChange={e => setEditing({ ...editing, display_name: e.target.value })} style={S.input} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={S.label}>Monthly Price (฿)</label>
                  <input type="number" step="0.01" value={editing.price_monthly || 0} onChange={e => setEditing({ ...editing, price_monthly: e.target.value })} style={S.input} />
                </div>
                <div>
                  <label style={S.label}>Yearly Price (฿)</label>
                  <input type="number" step="0.01" value={editing.price_yearly || 0} onChange={e => setEditing({ ...editing, price_yearly: e.target.value })} style={S.input} />
                </div>
              </div>
              <div>
                <label style={S.label}>Trial Days</label>
                <input type="number" value={editing.trial_days || 0} onChange={e => setEditing({ ...editing, trial_days: e.target.value })} style={S.input} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="isActive" checked={editing.is_active} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} style={{ width: 16, height: 16, accentColor: '#e91e63' }} />
                <label htmlFor="isActive" style={{ color: '#94a3b8', fontSize: 14 }}>Active</label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setEditing(null)} style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ background: '#e91e63', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#475569', fontSize: 13 }}>{label}</span>
      <span style={{ color, fontSize: 14, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

const S = {
  label: { display: 'block', fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' },
  input: { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
};