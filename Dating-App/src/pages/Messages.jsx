import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "../hooks/useIsMobile";
import { supabase } from "../lib/supabaseClient";

export default function Messages() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Inbox");
  const [myId, setMyId] = useState(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const fetchChats = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const uid = session.user.id;
    setMyId(uid);
    const { data: msgs, error } = await supabase
      .from('messages')
      .select('*')
      .or(`room_id.ilike.%${uid}%,chat_id.ilike.%${uid}%`)
      .order('created_at', { ascending: false });
    if (error) return console.error(error);
    const latestMap = {};
    msgs.forEach(m => {
      const rid = m.room_id || m.chat_id;
      if (!latestMap[rid]) latestMap[rid] = m;
    });
    const formatted = await Promise.all(Object.values(latestMap).map(async (m) => {
      const rid = m.room_id || m.chat_id;
      const otherId = rid.split('_').find(id => id !== uid);
      const { data: prof } = await supabase.from('profiles').select('username, avatar_url').eq('id', otherId).maybeSingle();
      return { roomId: rid, content: m.content, time: m.created_at, user: prof, senderId: m.sender_id };
    }));
    setChats(formatted);
    setLoading(false);
  };

  useEffect(() => {
    fetchChats();
    const channel = supabase.channel('list-update')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchChats)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const filtered = chats.filter(c =>
    activeTab === 'Inbox' ? c.senderId !== myId : c.senderId === myId
  );

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', paddingTop: isMobile ? 0 : 90 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', background: '#1e293b', borderBottom: '1px solid #334155', textAlign: 'center' }}>
        {['Inbox', 'Outbox'].map(t => (
          <div
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              flex: 1, padding: '15px', cursor: 'pointer',
              fontWeight: activeTab === t ? 'bold' : 'normal',
              color: activeTab === t ? '#e91e63' : '#94a3b8',
              borderBottom: activeTab === t ? '2px solid #e91e63' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            {t}
          </div>
        ))}
      </div>
      {/* Chat List */}
      {loading ? (
        <p style={{ padding: '20px', color: '#64748b', textAlign: 'center' }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
          <p style={{ margin: 0 }}>{activeTab === 'Inbox' ? 'ยังไม่มีข้อความเข้า' : 'ยังไม่มีข้อความออก'}</p>
        </div>
      ) : (
        filtered.map((c, i) => (
          <div
            key={i}
            onClick={() => navigate(`/room-chat/${c.roomId}`)}
            style={{ display: 'flex', padding: '15px', background: '#1e293b', borderBottom: '1px solid #334155', alignItems: 'center', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#1e293b'}
          >
            <img
              src={c.user?.avatar_url || 'https://via.placeholder.com/60/1e293b/94a3b8?text=?'}
              style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #334155' }}
            />
            <div style={{ marginLeft: '15px', flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 'bold', color: '#f1f5f9' }}>{c.user?.username || 'User'}</div>
              <div style={{ color: '#94a3b8', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.content}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}