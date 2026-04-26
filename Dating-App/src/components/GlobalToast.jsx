import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}
if (typeof window !== 'undefined') {
  const unlock = () => { getAudioCtx(); document.removeEventListener('click', unlock); document.removeEventListener('touchstart', unlock); };
  document.addEventListener('click', unlock);
  document.addEventListener('touchstart', unlock);
}
function playDing() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

export default function GlobalToast() {
  const [toasts, setToasts] = useState([]);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();
  const toastIdRef = useRef(0);
  const userIdRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        userIdRef.current = data.user.id;
        console.log('[Toast] My userId:', data.user.id);
      }
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    const addToast = (toast) => {
      const id = ++toastIdRef.current;
      setToasts(prev => [...prev.slice(-2), { ...toast, id }]);
      playDing();
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 12000);
    };

    console.log('[Toast] Subscribing for userId:', userId);

    // ── Listen to new messages ────────────────────────────
    const msgChannel = supabase
      .channel('global-msg-' + userId)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const m = payload.new;
          console.log('[Toast] New message event:', m);
          if (!m || m.sender_id === userIdRef.current) return;
          if (!m.chat_id || !m.chat_id.includes(userIdRef.current)) return;
          if (window.location.pathname.includes('/room-chat/' + m.chat_id)) return;

          const { data: sender } = await supabase.from('profiles')
            .select('username, avatar_url')
            .eq('id', m.sender_id).maybeSingle();

          addToast({
            type: 'message',
            avatar: sender?.avatar_url,
            name: sender?.usern0, 60),
            onClick: () => navigate('/room-chat/' + m.chat_id),
          });
        })
      .subscribe((status) => console.log('[Toast] Message channel:', status));

    // ── Listen to profile views ───────────────────────────
    const viewChannel = supabase
      .channel('global-view-' + userId)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profile_views', filter: 'viewed_id=eq.' + userId },
        async (payload) => {
          const v = payload.new;
          console.log('[Toast] New profile_view event:', v);
          if (!v || v.viewer_id === userIdRef.current) return;

          // If user is currently in chat with this viewer, skip toast (they're already chatting)
          const chatId = getChatId(userIdRef.current, v.viewer_id);
          if (window.location.pathname.includes('/room-chat/' + chatId)) {
            console.log('[Toast] Suppressed (already in chat with viewer)');
            ait supabase.from('profiles')
            .select('username, avatar_url')
            .eq('id', v.viewer_id).maybeSingle();

          addToast({
            type: 'view',
            avatar: viewer?.avatar_url,
            name: viewer?.username || 'Someone',
            text: 'is looking at your profile!',
            onClick: () => navigate('/room-chat/' + chatId),
          });
        })
      .subscribe((status) => console.log('[Toast] View channel:', status));

    return () => {
      console.log('[Toast] Cleaning up subscriptions');
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(viewChannel);
    };
  }, [userId, navigate]);

  if (toasts.length === 0) return null;

  return (
    <div style={S.wrap}>
      {toasts.map(t => (
        <div key={t.id} style={S.toast} onClick={t.onClick}>
          <img src={t.avatar || 'https://placehold.co/48x48/1e293b/94a3b8?text=?'} alt="" style={S.avatar} />
          <div style={S.body}>
            <div style={S.name}>{t.name}</div>
            <div style={S.text}>{t.text}</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setToasts(prev => prev.filter(x => x.id !== t.id)); }}
            style={S.closeBtn}
          >×</button>
        </div>
      ))}
    </div>
  );
}

const S = {
  wrap: {
    position: 'fixed', bottom: 20, left: 20, zIndex: 9999,
    display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none',
  },
  toast: {
    pointerEvents: 'auto',
    background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
    padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12,
    minWidth: 280, maxWidth: 340, cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(233, 30, 99, 0.2)',
    animation: 'slideInLeft 0.3s ease-out',
  },
  avatar: {
    width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
    flexShrink: 0, border: '2px solid #e91e63',
  },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: 800, clor: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  text: { fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 },
  closeBtn: { background: 'none', border: 'none', color: '#64748b', fontSize: 22, cursor: 'pointer', padding: '0 4px', lineHeight: 1 },
};

if (typeof document !== 'undefined') {
  const styleId = 'global-toast-anim';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = '@keyframes slideInLeft { from { transform: translateX(-120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
    document.head.appendChild(styleEl);
  }
}
