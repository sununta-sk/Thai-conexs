import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import logoImg from '../lib/LotusConnexs.jpeg';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [isOn, setIsOn]         = useState(false);
  const [pulling, setPulling]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [cooling, setCooling]   = useState(false);
  const navigate = useNavigate();
  const cordRef  = useRef(null);

  /* ── audio click ── */
  const playClick = () => {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(); osc.stop(ctx.currentTime + 0.12);
    } catch (_) {}
  };

  /* ── toggle lamp ── */
  const toggleLamp = () => {
    if (cooling) return;
    setCooling(true);
    playClick();
    setPulling(true);
    setTimeout(() => setPulling(false), 320);
    setIsOn(v => !v);
    setTimeout(() => setCooling(false), 420);
  };

  /* ── auth handlers ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (!error) navigate('/discover');
    else alert(error.message);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/discover' },
    });
    if (error) alert(error.message);
  };

  /* ── star positions (stable) ── */
  const stars = useRef(
    Array.from({ length: 70 }, (_, i) => ({
      id: i,
      top:  Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 1.8 + 0.4,
      dur:  2 + Math.random() * 4,
      del:  Math.random() * 4,
      maxO: 0.25 + Math.random() * 0.5,
    }))
  ).current;

  return (
    <>
      {/* ════ global styles ════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

        body { margin:0; overflow:hidden; }

        @keyframes twinkle {
          0%,100% { opacity: var(--minO); transform: scale(1); }
          50%      { opacity: var(--maxO); transform: scale(1.4); }
        }
        @keyframes cordPull {
          0%   { transform: scaleY(1); }
          40%  { transform: scaleY(1.38); }
          100% { transform: scaleY(1); }
        }
        @keyframes knobPull {
          0%   { transform: translateY(0); }
          40%  { transform: translateY(24px); }
          100% { transform: translateY(0); }
        }
        @keyframes swingCord {
          0%   { rotate: 0deg; }
          20%  { rotate: 7deg; }
          45%  { rotate: -4deg; }
          65%  { rotate: 2deg; }
          82%  { rotate: -1deg; }
          100% { rotate: 0deg; }
        }
        @keyframes fadeUp {
          from { opacity:0; transform: translateY(14px); }
          to   { opacity:1; transform: translateY(0); }
        }
      `}</style>

      {/* ════ root ════ */}
      <div style={{
        position: 'relative',
        width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
        background: isOn ? '#18201a' : '#111315',
        transition: 'background 0.7s cubic-bezier(.4,0,.2,1)',
        overflow: 'hidden',
      }}>

        {/* ── Stars ── */}
        {stars.map(s => (
          <div key={s.id} style={{
            position: 'absolute',
            top: `${s.top}%`, left: `${s.left}%`,
            width: s.size, height: s.size,
            borderRadius: '50%',
            background: '#fff',
            '--minO': 0.05,
            '--maxO': s.maxO,
            animation: `twinkle ${s.dur}s ${s.del}s infinite ease-in-out`,
            opacity: isOn ? 0 : 1,
            transition: 'opacity 0.7s ease',
            pointerEvents: 'none',
          }} />
        ))}

        {/* ── Ambient lamp glow ── */}
        <div style={{
          position: 'absolute',
          width: 480, height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,210,100,.45) 0%, rgba(255,200,80,.12) 40%, transparent 70%)',
          left: '50%', top: '50%',
          transform: 'translate(-68%, -54%)',
          opacity: isOn ? 1 : 0,
          transition: 'opacity 0.7s ease',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0, height: 180,
          background: 'radial-gradient(ellipse 55% 100% at 26% 100%, rgba(255,200,80,.10) 0%, transparent 70%)',
          opacity: isOn ? 1 : 0,
          transition: 'opacity 0.7s ease',
          pointerEvents: 'none',
        }} />

        {/* ════ Scene ════ */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', alignItems: 'center',
          gap: 56,
          padding: '0 32px',
        }}>

          {/* ────── LAMP ────── */}
          <div style={{ position: 'relative', flexShrink: 0 }}>

            {/* shade top glow */}
            <div style={{
              position: 'absolute', top: -28, left: '50%',
              transform: 'translateX(-50%)',
              width: 180, height: 70,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(255,220,110,.65) 0%, transparent 70%)',
              opacity: isOn ? 1 : 0,
              transition: 'opacity 0.7s ease',
              pointerEvents: 'none',
            }} />

            {/* ── shade ── */}
            <div style={{
              width: 148, height: 78,
              background: isOn ? '#f6f0e8' : '#e8e0d4',
              borderRadius: '74px 74px 10px 10px',
              boxShadow: isOn
                ? 'inset 0 -8px 20px rgba(0,0,0,.07), 0 4px 24px rgba(255,200,80,.55), 0 0 55px rgba(255,190,70,.22)'
                : 'inset 0 -8px 20px rgba(0,0,0,.18), 0 4px 10px rgba(0,0,0,.4)',
              transition: 'all 0.7s ease',
              position: 'relative',
            }}>
              {/* bulb inner */}
              <div style={{
                position: 'absolute', bottom: 8, left: '50%',
                transform: 'translateX(-50%)',
                width: 28, height: 18,
                background: 'radial-gradient(ellipse, rgba(255,235,150,.95) 0%, transparent 70%)',
                borderRadius: '50%',
                opacity: isOn ? 1 : 0,
                transition: 'opacity 0.7s ease',
              }} />
            </div>

            {/* ── neck ── */}
            <div style={{
              width: 14, height: 100,
              background: 'linear-gradient(to right, #c8bfb2, #e0d8cc, #c8bfb2)',
              margin: '0 auto',
              boxShadow: 'inset 2px 0 4px rgba(0,0,0,.2)',
            }} />

            {/* ── base ── */}
            <div style={{
              width: 100, height: 18,
              background: 'linear-gradient(to bottom, #d4ccc0, #b8b0a4)',
              borderRadius: 50,
              margin: '0 auto',
              boxShadow: '0 4px 12px rgba(0,0,0,.5)',
            }} />

            {/* ── cord + knob ── */}
            <div
              ref={cordRef}
              style={{
                position: 'absolute',
                left: 'calc(50% + 20px)',
                top: 52,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                transformOrigin: 'top center',
                animation: pulling ? 'swingCord 0.52s ease-out' : 'none',
              }}
            >
              {/* cord line */}
              <div style={{
                width: 2, height: 78,
                background: 'linear-gradient(to bottom, #9a9080, #7a7068)',
                animation: pulling ? 'cordPull 0.32s ease-out' : 'none',
              }} />

              {/* pull knob — LOGO */}
              <div
                onClick={toggleLamp}
                title={isOn ? 'Pull to turn off' : 'Pull to turn on'}
                style={{
                  width: 38, height: 38,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: isOn
                    ? '0 0 0 2px rgba(255,210,100,.5), 0 3px 12px rgba(200,149,106,.6)'
                    : '0 2px 8px rgba(0,0,0,.55)',
                  animation: pulling ? 'knobPull 0.32s ease-out' : 'none',
                  transition: 'box-shadow 0.4s ease',
                  flexShrink: 0,
                  userSelect: 'none',
                }}
              >
                <img
                  src={logoImg}
                  alt="Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  draggable={false}
                />
              </div>
            </div>

            {/* hint */}
            <div style={{
              position: 'absolute',
              bottom: -44, left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
              fontSize: 12,
              color: '#6a6460',
              letterSpacing: '0.3px',
              opacity: isOn ? 0 : 1,
              transition: 'opacity 0.4s ease',
              pointerEvents: 'none',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity=".5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              ดึงโลโก้เพื่อเปิดไฟ
            </div>
          </div>

          {/* ────── FORM PANEL ────── */}
          <div style={{
            width: 360,
            background: 'rgba(255,255,255,.055)',
            border: `1px solid ${isOn ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.07)'}`,
            borderRadius: 20,
            padding: '44px 40px',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            boxShadow: isOn
              ? '0 24px 60px rgba(0,0,0,.4), 0 0 0 1px rgba(255,210,100,.07), inset 0 1px 0 rgba(255,255,255,.08)'
              : '0 24px 60px rgba(0,0,0,.35)',
            opacity: isOn ? 1 : 0,
            transform: isOn ? 'translateX(0) scale(1)' : 'translateX(28px) scale(.97)',
            transition: 'opacity .55s cubic-bezier(.4,0,.2,1), transform .55s cubic-bezier(.4,0,.2,1), border-color .55s ease, box-shadow .55s ease',
            pointerEvents: isOn ? 'all' : 'none',
          }}>

            {/* logo in form */}
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <img src={logoImg} alt="Logo" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 2px 12px rgba(0,0,0,.4)' }} />
            </div>

            <h1 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 26, fontWeight: 400,
              color: '#f0ebe3',
              textAlign: 'center',
              margin: '0 0 28px',
              letterSpacing: '-0.3px',
            }}>Welcome Back</h1>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#7a7570', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }}>
                  Email
                </label>
                <input
                  type="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{
                    width: '100%', padding: '12px 15px',
                    background: 'rgba(0,0,0,.28)',
                    border: '1px solid rgba(255,255,255,.09)',
                    borderRadius: 10, color: '#f0ebe3',
                    fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(200,149,106,.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(200,149,106,.12)'; }}
                  onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,.09)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#7a7570', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }}>
                  Password
                </label>
                <input
                  type="password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '12px 15px',
                    background: 'rgba(0,0,0,.28)',
                    border: '1px solid rgba(255,255,255,.09)',
                    borderRadius: 10, color: '#f0ebe3',
                    fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(200,149,106,.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(200,149,106,.12)'; }}
                  onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,.09)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '13px',
                marginTop: 4,
                background: loading ? '#9a9080' : '#e8e0d4',
                color: '#1a1714',
                border: 'none', borderRadius: 10,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.2px',
                transition: 'transform .15s, box-shadow .15s, background .15s',
              }}
                onMouseEnter={e => { if (!loading) { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,.3)'; }}}
                onMouseLeave={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = 'none'; }}
              >
                {loading ? 'Signing in…' : 'Log In'}
              </button>
            </form>

            {/* divider */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0' }}>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(255,255,255,.09)' }} />
              <span style={{ padding: '0 12px', color: '#5a5550', fontSize: 11, letterSpacing: '0.5px' }}>OR</span>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(255,255,255,.09)' }} />
            </div>

            {/* Google */}
            <button onClick={handleGoogleLogin} style={{
              width: '100%', padding: '12px',
              background: 'rgba(255,255,255,.06)',
              border: '1px solid rgba(255,255,255,.10)',
              borderRadius: 10, color: '#c8c0b8',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14, fontWeight: 500,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'background .2s, border-color .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.10)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; }}
            >
              <img src="https://www.google.com/favicon.ico" width="17" alt="Google" />
              Continue with Google
            </button>

            <p style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: '#5a5550' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: '#c8956a', fontWeight: 600, textDecoration: 'none' }}>
                Sign Up
              </Link>
            </p>
          </div>

        </div>
      </div>
    </>
  );
}