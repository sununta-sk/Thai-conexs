import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AdminDashboard() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revenueStats, setRevenueStats] = useState({ totalRevenue: 0, commissionPending: 0, conversionRate: 0 });

  useEffect(() => {
    fetchAdminData();
  }, []);

  async function fetchAdminData() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      if (data) {
        setProfiles(data);
        
        // --- ส่วนคำนวณ Phase 3 ---
        const totalRev = data.reduce((sum, u) => sum + (Number(u.total_spent) || 0), 0);
        const totalComm = data.reduce((sum, u) => sum + (Number(u.commission_balance) || 0), 0);
        const premiumCount = data.filter(u => u.subscription_plan !== 'free').length;
        
        setRevenueStats({
          totalRevenue: totalRev,
          commissionPending: totalComm,
          conversionRate: data.length > 0 ? ((premiumCount / data.length) * 100).toFixed(1) : 0
        });
      }
    } catch (err) {
      console.error("Error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#1a1a1a', margin: 0 }}>💰 Revenue & Subscription Management</h1>
          <p style={{ color: '#666' }}>ติดตามรายได้และการเติบโตของธุรกิจ (Phase 3)</p>
        </div>
        <button onClick={fetchAdminData} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#fff', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>🔄 Refresh Data</button>
      </div>

      {/* --- การ์ดสถิติการเงิน Phase 3 --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <RevenueCard title="Total Gross Revenue" value={`฿${revenueStats.totalRevenue.toLocaleString()}`} sub="รายได้รวมทั้งหมด" color="#2c3e50" />
        <RevenueCard title="Commission Owed" value={`฿${revenueStats.commissionPending.toLocaleString()}`} sub="ยอดรอจ่ายเอเจนซี่" color="#e67e22" />
        <RevenueCard title="Conversion Rate" value={`${revenueStats.conversionRate}%`} sub="สัดส่วนผู้ใช้จ่ายเงิน" color="#9b59b6" />
      </div>

      <div style={{ background: '#fff', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #eee', background: '#fafafa' }}>
          <h3 style={{ margin: 0 }}>Detailed Member Billing</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fff', textAlign: 'left', borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '20px' }}>User / Username</th>
              <th>Current Plan</th>
              <th>Total Spent</th>
              <th>Subscription Expiry</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '15px 20px' }}>
                  <div style={{ fontWeight: 'bold' }}>{user.username || 'Anonymous'}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>Joined: {new Date(user.updated_at).toLocaleDateString()}</div>
                </td>
                <td>
                  <span style={{ 
                    padding: '5px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold',
                    background: user.subscription_plan === 'free' ? '#eee' : '#fff3cd',
                    color: user.subscription_plan === 'free' ? '#666' : '#856404'
                  }}>
                    {user.subscription_plan?.toUpperCase() || 'FREE'}
                  </span>
                </td>
                <td style={{ fontWeight: 'bold' }}>฿{(user.total_spent || 0).toLocaleString()}</td>
                <td style={{ color: '#666', fontSize: '14px' }}>
                  {user.subscription_expiry ? new Date(user.subscription_expiry).toLocaleDateString() : 'N/A'}
                </td>
                <td>
                  <button style={{ background: 'none', border: '1px solid #ddd', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Edit Plan</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const RevenueCard = ({ title, value, sub, color }) => (
  <div style={{ background: '#fff', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.04)', borderTop: `5px solid ${color}` }}>
    <div style={{ fontSize: '14px', color: '#888', marginBottom: '5px' }}>{title}</div>
    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '5px' }}>{value}</div>
    <div style={{ fontSize: '12px', color: color }}>{sub}</div>
  </div>
);