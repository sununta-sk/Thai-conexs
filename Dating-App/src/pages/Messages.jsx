import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Messages() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Inbox");
  const [myId, setMyId] = useState(null);
  const navigate = useNavigate();

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

  // Inbox = คนอื่นส่งมาหาเรา, Outbox = เราส่งออกไป
  const filtered = chats.filter(c =>
    activeTab === 'Inbox' ? c.senderId !== myId : c.senderId === myId
  );

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh' }}>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #ddd', textAlign: 'center' }}>
        {['Inbox', 'Outbox'].map(t => (
          <div
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              flex: 1, padding: '15px', cursor: 'pointer',
              fontWeight: activeTab === t ? 'bold' : 'normal',
              color: activeTab === t ? '#e91e63' : '#666',
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
        <p style={{ padding: '20px' }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
          <p style={{ margin: 0 }}>{activeTab === 'Inbox' ? 'ยังไม่มีข้อความเข้า' : 'ยังไม่มีข้อความออก'}</p>
        </div>
      ) : (
        filtered.map((c, i) => (
          <div
            key={i}
            onClick={() => navigate(`/room-chat/${c.roomId}`)}
            style={{ display: 'flex', padding: '15px', background: '#fff', borderBottom: '1px solid #eee', alignItems: 'center', cursor: 'pointer' }}
          >
            <img
              src={c.user?.avatar_url || 'https://via.placeholder.com/60'}
              style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover' }}
            />
            <div style={{ marginLeft: '15px', flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>{c.user?.username}</div>
              <div style={{ color: '#666', fontSize: '14px' }}>{c.content}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}