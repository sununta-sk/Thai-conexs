import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

// ─── Image Crop Modal (โครงสร้างเทพจาก Claude) ────────────────────────────────
function CropModal({ imageUrl, onConfirm, onCancel }) {
  const containerRef = useRef(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [scale, setScale] = useState(1);
  const dragging = useRef(false);
  const startMouse = useRef(null);
  const startPos = useRef(null);

  const onMouseDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    startMouse.current = { x: e.clientX, y: e.clientY };
    startPos.current = { ...pos };
  };

  const onMouseMove = useCallback((e) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - startMouse.current.x) / rect.width) * 100;
    const dy = ((e.clientY - startMouse.current.y) / rect.height) * 100;
    setPos({
      x: Math.max(0, Math.min(100, startPos.current.x - dx)),
      y: Math.max(0, Math.min(100, startPos.current.y - dy)),
    });
  }, [pos]);

  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <div style={CM.overlay}>
      <div style={CM.sheet}>
        <p style={CM.title}>ปรับตำแหน่งรูป</p>
        <div ref={containerRef} style={CM.frame} onMouseDown={onMouseDown}>
          <img src={imageUrl} alt="crop" draggable={false} style={{
            position: 'absolute', width: `${scale * 100}%`, height: `${scale * 100}%`,
            objectFit: 'cover', objectPosition: `${pos.x}% ${pos.y}%`,
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none',
          }} />
          <div style={CM.gridOverlay} />
        </div>
        <div style={CM.sliderRow}>
          <input type="range" min="1" max="2.5" step="0.05" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} style={CM.slider} />
        </div>
        <div style={CM.btnRow}>
          <button style={CM.cancelBtn} onClick={onCancel}>ยกเลิก</button>
          <button style={CM.confirmBtn} onClick={() => onConfirm({ x: pos.x, y: pos.y, scale })}>✓ ยืนยัน</button>
        </div>
      </div>
    </div>
  );
}

const CM = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' },
  sheet: { background: '#fff', borderRadius: 24, padding: '20px', width: '90%', maxWidth: 400 },
  title: { fontSize: 16, fontWeight: 800, textAlign: 'center', marginBottom: 15 },
  frame: { width: '100%', height: 250, borderRadius: 15, overflow: 'hidden', position: 'relative', background: '#000', cursor: 'move' },
  gridOverlay: { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '33.3% 33.3%' },
  sliderRow: { margin: '20px 0' },
  slider: { width: '100%', accentColor: '#e91e63' },
  btnRow: { display: 'flex', gap: 10 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 25, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' },
  confirmBtn: { flex: 1, padding: 12, borderRadius: 25, border: 'none', background: '#e91e63', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ProfileSetup() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [photos, setPhotos] = useState([]); 
  const [mainPhoto, setMainPhoto] = useState('');
  const [uploading, setUploading] = useState(false);
  const [cropTarget, setCropTarget] = useState(null);
  const [adminData, setAdminData] = useState({}); // ป้องกันข้อมูล Phase 2-3 หาย

  const [details, setDetails] = useState({
    height: '160cm', weight: '50kg', education: 'Bachelor Degree',
    englishAbility: 'Good', thaiAbility: 'Good', haveChildren: 'No',
    wantChildren: 'No', lookingFor: 'Men',
  });

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      
      if (data) {
        setUsername(data.username || '');
        setBio(data.bio || '');
        
        // เก็บค่า Phase 2-3 ไว้กันหาย
        setAdminData({
          referral_code: data.referral_code,
          is_verified: data.is_verified,
          subscription_plan: data.subscription_plan,
          commission_balance: data.commission_balance,
          referred_by_code: data.referred_by_code
        });

        // แก้ปัญหา "ล็อกเอาท์แล้วหาย" ด้วยการดึงข้อมูลแบบยืดหยุ่น
        const rawPhotos = data.photos || [];
        setPhotos(rawPhotos.map(p => {
          if (typeof p === 'string') return { url: p, cropX: 50, cropY: 50, scale: 1 };
          return p;
        }));
        
        setMainPhoto(data.avatar_url || '');
        if (data.details) setDetails(prev => ({ ...prev, ...data.details }));
      }
    }
    fetchProfile();
  }, []);

  async function handleUpload(e) {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;
      const { data: { user } } = await supabase.auth.getUser();
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      await supabase.storage.from('avatars').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setCropTarget({ url: publicUrl, index: null }); 
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }

  const handleCropConfirm = ({ x, y, scale }) => {
    const newPhoto = { url: cropTarget.url, cropX: x, cropY: y, scale };
    if (cropTarget.index === null) {
      setPhotos(prev => [...prev, newPhoto]);
      if (!mainPhoto) setMainPhoto(newPhoto.url);
    } else {
      setPhotos(prev => prev.map((p, i) => i === cropTarget.index ? newPhoto : p));
    }
    setCropTarget(null);
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, username, bio, avatar_url: mainPhoto, photos, details,
      ...adminData, // คืนค่า Phase 2-3 ลงฐานข้อมูล
      updated_at: new Date(),
    });
    if (!error) { alert('บันทึกเรียบร้อย!'); navigate('/discover'); }
    else alert(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div style={{ background: theme.bg, minHeight: '100vh', paddingBottom: '120px', color: theme.text }}>
      {cropTarget && <CropModal imageUrl={cropTarget.url} onConfirm={handleCropConfirm} onCancel={() => setCropTarget(null)} />}
      
      <div style={{ padding: '15px', display: 'flex', alignItems: 'center', background: theme.card, borderBottom: `1px solid ${theme.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={toggleTheme} style={{ background: theme.accent, border: 'none', color: '#fff', borderRadius: '20px', padding: '5px 15px', cursor: 'pointer' }}>
          {theme.isDarkMode ? '☀️' : '🌙'}
        </button>
        <h2 style={{ flex: 1, textAlign: 'center', margin: 0, fontSize: '18px' }}>My Profile</h2>
      </div>

      <div style={{ padding: '15px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {photos.map((photo, i) => (
            <div key={i} style={{ height: '140px', borderRadius: '10px', overflow: 'hidden', border: photo.url === mainPhoto ? `3px solid ${theme.accent}` : 'none', position: 'relative', background: '#eee' }}>
              <img src={photo.url} onClick={() => setMainPhoto(photo.url)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${photo.cropX}% ${photo.cropY}%`, cursor: 'pointer' }} />
              <button onClick={(e) => { e.stopPropagation(); setPhotos(photos.filter((_, idx) => idx !== i)); }} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer' }}>✕</button>
              <button onClick={(e) => { e.stopPropagation(); setCropTarget({ url: photo.url, index: i }); }} style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '20px', padding: '2px 8px', cursor: 'pointer', fontSize: 11 }}>✂️ ปรับ</button>
            </div>
          ))}
          {photos.length < 6 && (
            <label style={{ height: '140px', background: theme.card, border: `2px dashed ${theme.border}`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <input type="file" hidden onChange={handleUpload} disabled={uploading} accept="image/*" />
              <span style={{ fontSize: '30px', color: theme.accent }}>{uploading ? '...' : '+'}</span>
            </label>
          )}
        </div>

        <div style={{ background: theme.card, borderRadius: '12px', overflow: 'hidden', marginBottom: '15px', border: `1px solid ${theme.border}` }}>
          <Row label="Username" value={<input value={username} onChange={e => setUsername(e.target.value)} style={inputInRow(theme)} />} theme={theme} />
          <Row label="Bio" value={<textarea value={bio} onChange={e => setBio(e.target.value)} style={{ ...inputInRow(theme), height: '60px' }} />} theme={theme} border={false} />
        </div>

        <div style={{ background: theme.card, borderRadius: '12px', overflow: 'hidden', marginBottom: '15px', border: `1px solid ${theme.border}` }}>
          <Row label="Height" value={<input value={details.height} onChange={e => setDetails({ ...details, height: e.target.value })} style={inputInRow(theme)} />} theme={theme} />
          <Row label="Education" value={<select value={details.education} onChange={e => setDetails({ ...details, education: e.target.value })} style={inputInRow(theme)}><option>High School</option><option>Bachelor Degree</option><option>Masters Degree</option></select>} theme={theme} border={false} />
        </div>

        <button onClick={handleSave} style={{ width: '100%', padding: '16px', borderRadius: '30px', border: 'none', background: theme.accent, color: 'white', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', marginTop: '20px' }}>บันทึกโปรไฟล์</button>
        <button onClick={handleLogout} style={{ width: '100%', padding: '12px', borderRadius: '30px', border: `1px solid ${theme.accent}`, background: 'transparent', color: theme.accent, fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginTop: '10px' }}>Logout</button>
      </div>
    </div>
  );
}

const Row = ({ label, value, theme, border = true }) => (
  <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: border ? `1px solid ${theme.border}` : 'none' }}>
    <span style={{ fontSize: '15px' }}>{label}</span>
    <div style={{ width: '60%', textAlign: 'right' }}>{value}</div>
  </div>
);
const inputInRow = (theme) => ({ background: 'transparent', border: 'none', color: theme.isDarkMode ? '#aaa' : '#666', textAlign: 'right', fontSize: '15px', outline: 'none', width: '100%' });