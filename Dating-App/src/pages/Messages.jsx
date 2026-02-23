import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Messages() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Inbox');
  const [chatList, setChatList] = useState([]);
  const [loading, setLoading] = useState(true);

  // ส่วนของ Tabs ด้านบนตามรูปที่พี่ส่งมา
  const tabs = ['Fast', 'Unread', 'Inbox', 'Outbox'];

  useEffect(() => {
    async function fetchChats() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ดึงรายชื่อคนที่เราเคยคุยด้วย (สมมติจากตาราง profiles ก่อนเพื่อให้เห็นภาพ)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .limit(10);

      if (!error && data) {
        setChatList(data);
      }
      setLoading(false);
    }
    fetchChats();
  }, []);

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', paddingBottom: '100px' }}>
      
      {/* --- ส่วน Header Tabs แบบ ThaiFriendly --- */}
      <div style={{ 
        display: 'flex', 
        background: '#e4e6eb', 
        padding: '4px', 
        position: 'sticky', 
        top: 0, 
        zIndex: 10 
      }}>
        {tabs.map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              borderRadius: activeTab === tab ? '5px' : '0',
              background: activeTab === tab ? '#ffffff' : 'transparent',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: '0.2s'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* --- ส่วนรายการข้อความ --- */}
      <div style={{ marginTop: '2px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>กำลังโหลดข้อความ...</div>
        ) : (
          chatList.map((chat) => (
            <div 
              key={chat.id} 
              onClick={() => navigate(`/room-demo/${chat.id}`)}
              style={{ 
                display: 'flex', 
                padding: '12px 15px', 
                background: '#fff', 
                borderBottom: '1px solid #f0f0f0', 
                alignItems: 'center', 
                gap: '12px',
                cursor: 'pointer'
              }}
            >
              {/* รูปโปรไฟล์พร้อมขีดเขียวออนไลน์ */}
              <div style={{ position: 'relative', width: '70px', height: '70px' }}>
                <img 
                  src={chat.avatar_url || 'https://via.placeholder.com/70'} 
                  style={{ width: '100%', height: '100%', borderRadius: '4px', objectFit: 'cover' }} 
                />
                <div style={{ 
                  position: 'absolute', 
                  bottom: 0, 
                  left: 0, 
                  width: '100%', 
                  height: '4px', 
                  background: '#4cd137' 
                }}></div>
              </div>

              {/* ข้อมูลแชท */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#333' }}>
                    {chat.username || 'User'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>
                  {chat.details?.age || '25'}, {chat.details?.location || 'Bangkok'}
                </div>
                <div style={{ 
                  fontSize: '14px', 
                  color: '#555', 
                  marginTop: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '200px'
                }}>
                  Hi, what you looking for?
                </div>
              </div>

              {/* เวลาและตัวเลขแจ้งเตือน */}
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <div style={{ 
                  background: '#3498db', 
                  color: '#fff', 
                  borderRadius: '50%', 
                  width: '20px', 
                  height: '20px', 
                  fontSize: '11px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  1
                </div>
                <div style={{ fontSize: '11px', color: '#aaa' }}>9 hours ago</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}