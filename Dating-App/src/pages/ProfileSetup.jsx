import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { PROVINCES, getCitiesByProvince } from '../data/thaiLocations';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const T = {
  th: {
    profilePhotos:'Profile Photos (max 10)', faceVerify:'ยืนยันตัวตน (Face Verification)',
    verifiedTitle:'ยืนยันตัวตนแล้ว', verifiedSub:'คุณสามารถส่งข้อความได้แล้ว',
    notVerifiedTitle:'ยังไม่ได้ยืนยันตัวตน', notVerifiedSub:'คุณจะส่งข้อความไม่ได้จนกว่าจะยืนยัน',
    verifyBtn:'🤖 ยืนยันด้วย AI', verifyingBtn:'🔍 AI กำลังตรวจสอบ...',
    aboutYou:'เกี่ยวกับคุณ', username:'ชื่อผู้ใช้', bio:'แนะนำตัว',
    bodyEdu:'รูปร่างและการศึกษา', age:'อายุ', height:'ส่วนสูง (ซม.)', weight:'น้ำหนัก (กก.)',
    education:'การศึกษา', preferences:'ความต้องการ', gender:'เพศ', lookingFor:'มองหา',
    referralLabel:'กรอกรหัสเพื่อนเพื่อรับโบนัส €30',
    saveBtn:'บันทึกข้อมูลโปรไฟล์', logoutBtn:'ออกจากระบบ',
    eduOptions:['มัธยมศึกษา','ปริญญาตรี','ปริญญาโท','ปริญญาเอก'],
    genderOptions:['ชาย','หญิง','อื่นๆ'], lookingOptions:['ผู้ชาย','ผู้หญิง','ทุกเพศ'],
    copyBtn:'📋 คัดลอกโค้ด', copiedBtn:'✅ คัดลอกแล้ว!',
    sidebarAbout:'เกี่ยวกับฉัน', sidebarInfo:'ข้อมูลส่วนตัว', sidebarLifestyle:'ไลฟ์สไตล์',
  },
  en: {
    profilePhotos:'Profile Photos (max 10)', faceVerify:'Get Your Verified Badge',
    verifiedTitle:'Identity Verified', verifiedSub:'You can now send messages',
    notVerifiedTitle:'Not Yet Verified', notVerifiedSub:'Your profile is almost complete! Verify your identity with AI to unlock your Verified Badge and stand out to other members.',
    verifyBtn:'🤖 Verify with AI', verifyingBtn:'🔍 AI is checking...',
    aboutYou:'About You', username:'Username', bio:'Bio',
    bodyEdu:'Body & Education', age:'Age', height:'Height (cm)', weight:'Weight (kg)',
    education:'Education', preferences:'Preferences', gender:'Gender', lookingFor:'Looking For',
    referralLabel:"Enter a friend's code to get €30 bonus",
    saveBtn:'Save Profile', logoutBtn:'Logout',
    eduOptions:['High School','Bachelor Degree','Master Degree','PhD'],
    genderOptions:['Male','Female','Transgender','Non-binary','Gay','Bisexual','Other'], lookingOptions:['Men','Women','Everyone'],
    copyBtn:'📋 Copy Code', copiedBtn:'✅ Copied!',
    sidebarAbout:'About Me', sidebarInfo:'Personal Info', sidebarLifestyle:'Lifestyle',
  },
};

function dataURLtoBlob(dataURL) {
  const base64Data = dataURL.split(',')[1];
  const byteCharacters = atob(base64Data);
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) byteArray[i] = byteCharacters.charCodeAt(i);
  return new Blob([byteArray], { type: 'image/jpeg' });
}

function useIsDesktop(breakpoint = 900) {
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= breakpoint : false);
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isDesktop;
}

function ChipSelect({ label, options, value, onChange, multi = false }) {
  const toggle = (opt) => {
    if (multi) {
      const arr = Array.isArray(value) ? value : [];
      onChange(arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt]);
    } else {
      onChange(value === opt ? '' : opt);
    }
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#94a3b8' }}>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(opt => {
          const active = multi ? (Array.isArray(value) && value.includes(opt)) : value === opt;
          return (
            <button key={opt} onClick={() => toggle(opt)} type="button"
              style={{
                padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid ' + (active ? '#e91e63' : '#334155'),
                background: active ? 'linear-gradient(135deg, #e91e63, #c2185b)' : '#0f172a',
                color: active ? '#fff' : '#94a3b8',
                boxShadow: active ? '0 2px 8px rgba(233,30,99,0.3)' : 'none',
                transition: 'all 0.15s',
              }}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop(900);
  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  const [username, setUsername]   = useState('');
  const [bio, setBio]             = useState('');
  const [photos, setPhotos]       = useState([]);
  const [mainPhoto, setMainPhoto] = useState('');
  const [uploading, setUploading] = useState(false);
  const [details, setDetails]     = useState({ age:'', height:'', weight:'', education:'', gender:'', lookingFor:'' });
  const [lifestyle, setLifestyle] = useState({
    hobbies: [],
    sleepSchedule: '',
    drinking: '',
    smoking: '',
    exercise: '',
    personality: '',
  });
  const [myReferralCode, setMyReferralCode] = useState('');
  const [friendCode, setFriendCode]         = useState('');
  const [balance, setBalance]               = useState(0);
  const [isVerified, setIsVerified]         = useState(false);
  const [verifying, setVerifying]           = useState(false);
  const [verifyResult, setVerifyResult]     = useState(null);
  const [verifyMessage, setVerifyMessage]   = useState('');
  const [cameraOpen, setCameraOpen]         = useState(false);
  const [capturedImage, setCapturedImage]   = useState(null);
  const [cameraError, setCameraError]       = useState('');
  // preferredLang removed - controlled by Navbar toggle
  const [copied, setCopied]                 = useState(false);

  const openCamera = async () => {
    setCameraError(''); setCapturedImage(null); setVerifyResult(null); setVerifyMessage('');
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false });
      streamRef.current = stream;
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch (err) {
      setCameraError('Could not open camera: ' + err.message);
    }
  };

  const closeCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth  || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
    closeCamera();
  };

  const { lang } = useTranslation(['common']);
  const tx = T[lang] || T['en'];

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (data) {
        setUsername(data.username || '');
        setBio(data.bio || '');
        setBalance(data.commission_balance || 0);
        setMainPhoto(data.avatar_url || '');
        setIsVerified(data.is_verified || false);
        setFriendCode(data.referred_by || '');
        if (data.details) setDetails(prev => ({ ...prev, ...data.details }));
        if (data.lifestyle) setLifestyle(prev => ({ ...prev, ...data.lifestyle }));
        const rawPhotos = data.photos || [];
        setPhotos(rawPhotos.map(p => {
          if (typeof p === 'string') {
            try { return JSON.parse(p); } catch { return { url: p, cropX: 50, cropY: 50, scale: 1 }; }
          }
          return p;
        }));
        if (!data.referral_code) {
          const uniqueCode = `TCN-${user.id.slice(0,6).toUpperCase()}`;
          setMyReferralCode(uniqueCode);
        } else {
          setMyReferralCode(data.referral_code);
        }
      }
    }
    fetchProfile();
  }, []);

  const handleUpload = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;
      const { data: { user } } = await supabase.auth.getUser();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${user.id}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const isFirst = photos.length === 0;
      setPhotos(prev => [...prev, { url: publicUrl, cropX: 50, cropY: 50, scale: 1 }]);
      if (isFirst) setMainPhoto(publicUrl);
      await supabase.from('photo_moderation_queue').insert({
        user_id: user.id, photo_url: publicUrl,
        photo_bucket: 'avatars', status: 'pending', is_profile_photo: isFirst,
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleVerify = async () => {
    if (!capturedImage) return;
    setVerifying(true); setVerifyResult(null); setVerifyMessage('');
    try {
      const base64 = capturedImage.split(',')[1];
      const resp = await fetch(`${API_BASE}/api/face-verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: 'image/jpeg' }),
      });
      const result = await resp.json();
      if (result?.pass) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('profiles').update({ is_verified: true }).eq('id', user.id);
        setIsVerified(true);
        setVerifyResult('pass');
        setVerifyMessage(result.reason || tx.verifiedTitle);
        const { data: myProfile } = await supabase
          .from('profiles').select('referred_by').eq('id', user.id).maybeSingle();
        if (myProfile?.referred_by) {
          const { count } = await supabase
            .from('affiliate_referrals')
            .select('*', { count: 'exact', head: true })
            .eq('referred_user_id', user.id);
          if (count === 0) {
            const { data: referrer } = await supabase
              .from('profiles').select('id, commission_balance')
              .eq('referral_code', myProfile.referred_by).maybeSingle();
            if (referrer) {
              await supabase.from('profiles')
                .update({ commission_balance: (referrer.commission_balance || 0) + 30 })
                .eq('id', referrer.id);
              await supabase.from('affiliate_referrals').insert({
                referrer_id: referrer.id, referred_user_id: user.id,
                commission_amount: 30, status: 'paid',
              });
            }
          }
        }
      } else {
        setVerifyResult('fail');
        setVerifyMessage(result?.reason || 'ไม่พบใบหน้าที่ชัดเจน กรุณาลองใหม่');
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const blob = dataURLtoBlob(capturedImage);
          const filePath = `face-verify/${user.id}/${Date.now()}.jpg`;
          await supabase.storage.from('avatars').upload(filePath, blob, { contentType: 'image/jpeg' });
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
          await supabase.from('photo_moderation_queue').insert({
            user_id: user.id, photo_url: publicUrl, photo_bucket: 'avatars',
            status: 'pending', is_profile_photo: false,
            flag_reason: 'face_verify_fallback', flagged_by: 'system',
          });
        } catch (uploadErr) { console.error('Fallback upload failed:', uploadErr.message); }
      }
    } catch (err) {
      setVerifyResult('fail'); setVerifyMessage('ระบบ AI มีปัญหา — ส่งให้ Admin ตรวจสอบแทนแล้ว');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const blob = dataURLtoBlob(capturedImage);
        const filePath = `face-verify/${user.id}/${Date.now()}.jpg`;
        await supabase.storage.from('avatars').upload(filePath, blob, { contentType: 'image/jpeg' });
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
        await supabase.from('photo_moderation_queue').insert({
          user_id: user.id, photo_url: publicUrl, photo_bucket: 'avatars',
          status: 'pending', is_profile_photo: false,
          flag_reason: 'face_verify_fallback', flagged_by: 'system',
        });
      } catch (uploadErr) { console.error('Fallback upload failed:', uploadErr.message); }
    } finally { setVerifying(false); }
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!details.country || !details.province || !details.city) {
      alert(lang === 'th' ? '⚠️ กรุณากรอก Country, Province และ City ให้ครบ' : '⚠️ Please fill Country, Province and City');
      return;
    }
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, username, bio, avatar_url: mainPhoto,
      photos, details, referral_code: myReferralCode,
      lifestyle,
      updated_at: new Date(),
      referred_by: friendCode.trim().toUpperCase() || null,
    }, { onConflict: 'id' });
    if (!error) {
      alert('✅ ' + tx.saveBtn);
      navigate('/discover');
    } else {
      alert('Error: ' + error.message);
    }
  };

  const referralDisabled = isVerified && !!friendCode;

  // ──────────────────────────────────────────────
  // SIDEBAR (Desktop only)
  // ──────────────────────────────────────────────
  const Sidebar = (
    <div style={S.sidebar}>
      {/* Avatar */}
      <div style={S.avatarWrap}>
        {mainPhoto ? (
          <img src={mainPhoto} alt="me" style={S.avatarImg} />
        ) : (
          <div style={S.avatarPlaceholder}>👤</div>
        )}
        {isVerified && <div style={S.verifiedRibbon}>✓ Verified</div>}
      </div>

      <div style={S.sidebarUsername}>{username || '—'}</div>

      {/* About Me */}
      {bio && (
        <div style={S.sidebarCard}>
          <div style={S.sidebarSection}>{tx.sidebarAbout}</div>
          <div style={S.sidebarBio}>{bio}</div>
        </div>
      )}

      {/* Personal Info Table */}
      <div style={S.sidebarCard}>
        <div style={S.sidebarSection}>{tx.sidebarInfo}</div>
        <table style={S.infoTable}>
          <tbody>
            {details.gender     && <tr><td style={S.infoKey}>{tx.gender}</td><td style={S.infoVal}>{details.gender}</td></tr>}
            {details.age        && <tr><td style={S.infoKey}>{tx.age}</td><td style={S.infoVal}>{details.age}</td></tr>}
            {details.height     && <tr><td style={S.infoKey}>{tx.height}</td><td style={S.infoVal}>{details.height} cm</td></tr>}
            {details.weight     && <tr><td style={S.infoKey}>{tx.weight}</td><td style={S.infoVal}>{details.weight} kg</td></tr>}
            {details.education  && <tr><td style={S.infoKey}>{tx.education}</td><td style={S.infoVal}>{details.education}</td></tr>}
            {details.lookingFor && <tr><td style={S.infoKey}>{tx.lookingFor}</td><td style={S.infoVal}>{details.lookingFor}</td></tr>}
          </tbody>
        </table>
      </div>

      <Field label={<span>Country <span style={{ color: '#ef4444' }}>*</span></span>}>
        <select value={details.country || ''} onChange={e => setDetails({...details, country: e.target.value})} style={{ ...S.input, borderColor: details.country ? '#334155' : '#ef4444' }}>
          <option value="">-- Select your country --</option>
          <option value="Thailand">🇹🇭 Thailand</option>
          <option value="United States">🇺🇸 United States</option>
          <option value="United Kingdom">🇬🇧 United Kingdom</option>
          <option value="Australia">🇦🇺 Australia</option>
          <option value="Canada">🇨🇦 Canada</option>
          <option value="Germany">🇩🇪 Germany</option>
          <option value="France">🇫🇷 France</option>
          <option value="Italy">🇮🇹 Italy</option>
          <option value="Spain">🇪🇸 Spain</option>
          <option value="Netherlands">🇳🇱 Netherlands</option>
          <option value="Belgium">🇧🇪 Belgium</option>
          <option value="Sweden">🇸🇪 Sweden</option>
          <option value="Norway">🇳🇴 Norway</option>
          <option value="Denmark">🇩🇰 Denmark</option>
          <option value="Finland">🇫🇮 Finland</option>
          <option value="Switzerland">🇨🇭 Switzerland</option>
          <option value="Austria">🇦🇹 Austria</option>
          <option value="Ireland">🇮🇪 Ireland</option>
          <option value="Portugal">🇵🇹 Portugal</option>
          <option value="Poland">🇵🇱 Poland</option>
          <option value="Greece">🇬🇷 Greece</option>
          <option value="Russia">🇷🇺 Russia</option>
          <option value="Japan">🇯🇵 Japan</option>
          <option value="South Korea">🇰🇷 South Korea</option>
          <option value="China">🇨🇳 China</option>
          <option value="Taiwan">🇹🇼 Taiwan</option>
          <option value="Hong Kong">🇭🇰 Hong Kong</option>
          <option value="Singapore">🇸🇬 Singapore</option>
          <option value="Malaysia">🇲🇾 Malaysia</option>
          <option value="Indonesia">🇮🇩 Indonesia</option>
          <option value="Philippines">🇵🇭 Philippines</option>
          <option value="Vietnam">🇻🇳 Vietnam</option>
          <option value="Laos">🇱🇦 Laos</option>
          <option value="Cambodia">🇰🇭 Cambodia</option>
          <option value="Myanmar">🇲🇲 Myanmar</option>
          <option value="India">🇮🇳 India</option>
          <option value="Pakistan">🇵🇰 Pakistan</option>
          <option value="Bangladesh">🇧🇩 Bangladesh</option>
          <option value="Sri Lanka">🇱🇰 Sri Lanka</option>
          <option value="UAE">🇦🇪 UAE</option>
          <option value="Saudi Arabia">🇸🇦 Saudi Arabia</option>
          <option value="Israel">🇮🇱 Israel</option>
          <option value="Turkey">🇹🇷 Turkey</option>
          <option value="Egypt">🇪🇬 Egypt</option>
          <option value="South Africa">🇿🇦 South Africa</option>
          <option value="Brazil">🇧🇷 Brazil</option>
          <option value="Argentina">🇦🇷 Argentina</option>
          <option value="Mexico">🇲🇽 Mexico</option>
          <option value="New Zealand">🇳🇿 New Zealand</option>
          <option value="Other">Other</option>
        </select>
        {!details.country && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Required: please select your country</div>}
      </Field>

      <Field label={<span>{lang === 'th' ? 'จังหวัด' : 'Province'} <span style={{ color: '#ef4444' }}>*</span></span>}>
        <select
          value={details.province || ''}
          onChange={e => setDetails({...details, province: e.target.value, city: ''})}
          style={{ ...S.input, borderColor: details.province ? '#334155' : '#ef4444' }}
        >
          <option value="">{lang === 'th' ? '— เลือกจังหวัด —' : '-- Select province --'}</option>
          {PROVINCES.map(p => (
            <option key={p.id} value={p.id}>{p.name[lang === 'th' ? 'th' : 'en']}</option>
          ))}
        </select>
        {!details.province && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{lang === 'th' ? 'กรุณาเลือกจังหวัด' : 'Required: please select your province'}</div>}
      </Field>

      <Field label={<span>{lang === 'th' ? 'เขต/อำเภอ' : 'City / District'} <span style={{ color: '#ef4444' }}>*</span></span>}>
        <select
          value={details.city || ''}
          onChange={e => setDetails({...details, city: e.target.value})}
          disabled={!details.province}
          style={{ ...S.input, borderColor: details.city ? '#334155' : '#ef4444', opacity: details.province ? 1 : 0.6 }}
        >
          <option value="">{lang === 'th' ? '— เลือกเขต/อำเภอ —' : '-- Select city --'}</option>
          {getCitiesByProvince(details.province).map(c => (
            <option key={c.id} value={c.id}>{c.name[lang === 'th' ? 'th' : 'en']}</option>
          ))}
        </select>
        {details.province && !details.city && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{lang === 'th' ? 'กรุณาเลือกเขต/อำเภอ' : 'Required: please select your city'}</div>}
      </Field>

      <Field label="Preferred age range">
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" placeholder="Min age" value={details.preferred_age_min || ''} onChange={e => setDetails({...details, preferred_age_min: e.target.value})} style={S.input} />
          <input type="number" placeholder="Max age" value={details.preferred_age_max || ''} onChange={e => setDetails({...details, preferred_age_max: e.target.value})} style={S.input} />
        </div>
      </Field>
      {/* Lifestyle */}
      {(lifestyle.hobbies?.length > 0 || lifestyle.sleepSchedule || lifestyle.drinking || lifestyle.smoking || lifestyle.exercise || lifestyle.personality) && (
        <div style={S.sidebarCard}>
          <div style={S.sidebarSection}>{tx.sidebarLifestyle}</div>
          <div style={S.sidebarChipRow}>
            {lifestyle.hobbies?.map(h => <span key={h} style={S.sidebarChip}>{h}</span>)}
            {lifestyle.sleepSchedule && <span style={S.sidebarChip}>{lifestyle.sleepSchedule}</span>}
            {lifestyle.drinking && <span style={S.sidebarChip}>{lifestyle.drinking}</span>}
            {lifestyle.smoking && <span style={S.sidebarChip}>{lifestyle.smoking}</span>}
            {lifestyle.exercise && <span style={S.sidebarChip}>{lifestyle.exercise}</span>}
            {lifestyle.personality && <span style={S.sidebarChip}>{lifestyle.personality}</span>}
          </div>
        </div>
      )}
    </div>
  );

  // ──────────────────────────────────────────────
  // MAIN CONTENT (forms)
  // ──────────────────────────────────────────────
  const MainContent = (
    <div style={S.main}>
      {/* Profile Photos */}
      <SectionTitle>{tx.profilePhotos}</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {photos.map((p, i) => (
          <div key={i} style={{ aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: p.url === mainPhoto ? '3px solid #e91e63' : '1px solid #334155' }}>
            <img src={p.url} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setMainPhoto(p.url)} />
            <button onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} style={S.delBtn}>✕</button>
            {p.url === mainPhoto && <div style={S.mainBadge}>Main</div>}
          </div>
        ))}
        {photos.length < 10 && (
          <label style={S.uploadBox}>
            <input type="file" hidden onChange={handleUpload} accept="image/*" />
            {uploading ? '...' : '+'}
          </label>
        )}
        {photos.length === 0 && (
          <div style={{ ...S.uploadBox, cursor: 'default', flexDirection: 'column', gap: 6, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 20 }}>📸</div>
            <div style={{ fontSize: 10, color: '#e91e63', fontWeight: 700, lineHeight: 1.4 }}>Upload photos to message people</div>
            <div style={{ fontSize: 9, color: '#fbbf24', fontWeight: 600, lineHeight: 1.4 }}>🎁 4+ photos = prize draw entry!</div>
          </div>
        )}
        {photos.length > 0 && photos.length < 4 && (
          <div style={{ ...S.uploadBox, cursor: 'default', flexDirection: 'column', gap: 6, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 18 }}>🎁</div>
            <div style={{ fontSize: 9, color: '#fbbf24', fontWeight: 600, lineHeight: 1.4 }}>Upload {4 - photos.length} more photo{4 - photos.length > 1 ? 's' : ''} to enter prize draw!</div>
          </div>
        )}
      </div>

      {/* Identity Verification - hidden */}
      <div style={{ display: "none" }}>
      <SectionTitle>{tx.faceVerify}</SectionTitle>
      {isVerified ? (
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1.5px solid #22c55e', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <span style={{ fontSize: '28px' }}>✅</span>
          <div>
            <div style={{ fontWeight: 'bold', color: '#4ade80', fontSize: '15px' }}>{tx.verifiedTitle}</div>
            <div style={{ fontSize: '13px', color: '#86efac' }}>{tx.verifiedSub}</div>
          </div>
        </div>
      ) : (
        <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1.5px solid #eab308', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '15px', marginBottom: 6 }}>{tx.notVerifiedTitle}</div>
              <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>{tx.notVerifiedSub}</div>
            </div>
          </div>
          {cameraOpen && (
            <div style={{ marginBottom: '12px', borderRadius: '12px', overflow: 'hidden', position: 'relative', background: '#000' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block', borderRadius: '12px' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '160px', height: '160px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.8)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: '12px', opacity: 0.8 }}>วางใบหน้าให้อยู่ในวงกลม</div>
            </div>
          )}
          {capturedImage && !cameraOpen && (
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <img src={capturedImage} style={{ width: '120px', height: '120px', borderRadius: '60px', objectFit: 'cover', border: '3px solid #fbbf24' }} />
            </div>
          )}
          {cameraError && <div style={{ background: 'rgba(239, 68, 68, 0.15)', borderRadius: '10px', padding: '10px', marginBottom: '10px', color: '#f87171', fontSize: '13px', textAlign: 'center' }}>❌ {cameraError}</div>}
          {verifyResult === 'pass' && <div style={{ background: 'rgba(34, 197, 94, 0.15)', borderRadius: '10px', padding: '10px', marginBottom: '10px', color: '#4ade80', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>✅ {verifyMessage}</div>}
          {verifyResult === 'fail' && <div style={{ background: 'rgba(239, 68, 68, 0.15)', borderRadius: '10px', padding: '10px', marginBottom: '10px', color: '#f87171', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>❌ {verifyMessage}</div>}
          {!cameraOpen && !capturedImage && (
            <button onClick={openCamera} style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #e91e63, #c2185b)', color: '#fff', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
              📷 Open Camera
            </button>
          )}
          {cameraOpen && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={capturePhoto} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>📸 ถ่ายภาพ</button>
              <button onClick={closeCamera} style={{ padding: '13px 16px', borderRadius: '12px', border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', fontWeight: 'bold', cursor: 'pointer' }}>ยกเลิก</button>
            </div>
          )}
          {capturedImage && !cameraOpen && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleVerify} disabled={verifying} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: verifying ? '#334155' : 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff', fontWeight: 'bold', fontSize: '15px', cursor: verifying ? 'not-allowed' : 'pointer' }}>
                {verifying ? tx.verifyingBtn : tx.verifyBtn}
              </button>
              <button onClick={openCamera} style={{ padding: '13px 16px', borderRadius: '12px', border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', fontWeight: 'bold', cursor: 'pointer' }}>🔄 ถ่ายใหม่</button>
            </div>
          )}
        </div>
      )}

      </div>
      {/* About You */}
      <SectionTitle>{tx.aboutYou}</SectionTitle>
      <Field label={tx.username}><input value={username} onChange={e => setUsername(e.target.value)} style={S.input} /></Field>
      <Field label={tx.bio}><textarea value={bio} onChange={e => setBio(e.target.value)} style={{ ...S.input, height: '80px', resize: 'none' }} /></Field>

      {/* Body & Education */}
      <SectionTitle>{tx.bodyEdu}</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
        <Field label={tx.age}>
          <input type="number" min="18" max="99" placeholder="25"
            value={details.age} onChange={e => setDetails({...details, age: e.target.value})} style={S.input} />
        </Field>
        <Field label={tx.height}>
          <input value={details.height} onChange={e => setDetails({...details, height: e.target.value})} style={S.input} />
        </Field>
        <Field label={tx.weight}>
          <input value={details.weight} onChange={e => setDetails({...details, weight: e.target.value})} style={S.input} />
        </Field>
      </div>
      <Field label={tx.education}>
        <select value={details.education} onChange={e => setDetails({...details, education: e.target.value})} style={S.input}>
          <option value="">—</option>
          {tx.eduOptions.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>

      {/* Preferences */}
      <SectionTitle>{tx.preferences}</SectionTitle>
      <Field label={tx.gender}>
        <select value={details.gender} onChange={e => setDetails({...details, gender: e.target.value})} style={S.input}>
          <option value="">—</option>
          {tx.genderOptions.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
      <Field label={tx.lookingFor}>
        <select value={details.lookingFor} onChange={e => setDetails({...details, lookingFor: e.target.value})} style={S.input}>
          <option value="">—</option>
          {tx.lookingOptions.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
      <Field label="Children">
        <select value={details.children || ''} onChange={e => setDetails({...details, children: e.target.value})} style={S.input}>
          <option value="">--</option>
          <option value="No">No</option>
          <option value="Has children">Has children</option>
          <option value="Want children">Want children</option>
          <option value="Don't want">Don't want</option>
        </select>
      </Field>

      {/* Lifestyle */}
      <SectionTitle>✨ Lifestyle</SectionTitle>

      <ChipSelect label="🎯 Hobbies" multi={true} value={lifestyle.hobbies}
        onChange={v => setLifestyle(l => ({ ...l, hobbies: v }))}
        options={['📚 Reading', '🎮 Gaming', '🏋️ Fitness', '🍳 Cooking', '✈️ Travel', '🎵 Music', '🎨 Art', '📸 Photography', '🌿 Nature', '🐾 Pets', '🧘 Yoga', '🏄 Sports']} />

      <ChipSelect label="🌙 Sleep Schedule" value={lifestyle.sleepSchedule}
        onChange={v => setLifestyle(l => ({ ...l, sleepSchedule: v }))}
        options={['🌅 Early Bird', '🦉 Night Owl', '😴 Flexible']} />

      <ChipSelect label="🍺 Drinking" value={lifestyle.drinking}
        onChange={v => setLifestyle(l => ({ ...l, drinking: v }))}
        options={['🚫 Never', '🥂 Social', '🍻 Regular']} />

      <ChipSelect label="🚬 Smoking" value={lifestyle.smoking}
        onChange={v => setLifestyle(l => ({ ...l, smoking: v }))}
        options={['🚭 No', '🚬 Sometimes', '💨 Yes']} />

      <ChipSelect label="💪 Exercise" value={lifestyle.exercise}
        onChange={v => setLifestyle(l => ({ ...l, exercise: v }))}
        options={['🛋️ Never', '🚶 Sometimes', '🏃 Often', '🏆 Daily']} />

      <ChipSelect label="🧠 Personality" value={lifestyle.personality}
        onChange={v => setLifestyle(l => ({ ...l, personality: v }))}
        options={['🪄 Introvert', '🎉 Extrovert', '⚖️ Ambivert']} />

      {/* TCN Referral */}
      <div style={S.referralCard}>
        <p style={{ margin: 0, fontSize: '12px', opacity: 0.9, fontWeight: 'bold', color: '#fff' }}>TCN REFERRAL SYSTEM</p>
        <h2 style={{ margin: '5px 0', fontSize: '32px', fontWeight: '900', color: '#fff' }}>{myReferralCode}</h2>
        <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', padding: '5px 15px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
          My Earnings: €{balance}
        </div>
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={() => { navigator.clipboard.writeText(myReferralCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            style={{ background: copied ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: '20px', padding: '6px 18px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
            {copied ? tx.copiedBtn : tx.copyBtn}
          </button>
        </div>
      </div>

      <div style={{ marginTop: '16px', padding: '15px', background: '#0f172a', borderRadius: '15px', border: '1px dashed #334155' }}>
        <label style={S.label}>{tx.referralLabel}</label>
        <input placeholder="TCN-XXXX" value={friendCode}
          onChange={e => setFriendCode(e.target.value)} disabled={referralDisabled}
          style={{ ...S.input, opacity: referralDisabled ? 0.5 : 1 }} />
        {referralDisabled && <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0' }}>✓ ใส่โค้ดแล้ว ไม่สามารถแก้ไขได้</p>}
      </div>

      <button onClick={handleSave} style={S.saveBtn}>{tx.saveBtn}</button>


      <button onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }} style={S.logoutBtn}>
        {tx.logoutBtn}
      </button>
    </div>
  );

  // ──────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────
  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', paddingBottom: '120px', paddingTop: '90px' }}>
      <div style={isDesktop ? S.desktopWrap : S.mobileWrap}>
        {isDesktop ? (
          <>
            {Sidebar}
            {MainContent}
          </>
        ) : (
          <>
            {/* Mobile: stacked layout, no separate sidebar */}
            {MainContent}
          </>
        )}
      </div>
    </div>
  );
}

const SectionTitle = ({children}) => <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#e91e63', marginTop: '25px', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{children}</h3>;
const Field = ({label, children}) => <div style={{ marginBottom: '15px' }}><label style={S.label}>{label}</label>{children}</div>;

const S = {
  // Layout
  desktopWrap: { maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'flex-start' },
  mobileWrap:  { maxWidth: 500, margin: '0 auto' },

  // Sidebar
  sidebar: { background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 20, position: 'sticky', top: 100, display: 'flex', flexDirection: 'column', gap: 14 },
  avatarWrap: { position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden', background: '#0f172a', border: '1px solid #334155' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  avatarPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, color: '#475569' },
  verifiedRibbon: { position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', background: '#e91e63', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' },
  sidebarUsername: { textAlign: 'center', fontSize: 22, fontWeight: 800, color: '#f1f5f9' },
  sidebarCard: { background: '#0f172a', border: '1px solid #334155', borderRadius: 12, padding: 14 },
  sidebarSection: { fontSize: 11, fontWeight: 800, color: '#e91e63', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 },
  sidebarBio: { fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, fontWeight: 500 },
  infoTable: { width: '100%', borderCollapse: 'collapse' },
  infoKey: { fontSize: 11, color: '#64748b', fontWeight: 600, padding: '6px 0', textTransform: 'capitalize', whiteSpace: 'nowrap' },
  infoVal: { fontSize: 13, color: '#f1f5f9', fontWeight: 600, padding: '6px 0', textAlign: 'right' },
  sidebarChipRow: { display: 'flex', flexWrap: 'wrap', gap: 5 },
  sidebarChip: { fontSize: 11, fontWeight: 600, background: 'rgba(233, 30, 99, 0.15)', border: '1px solid rgba(233, 30, 99, 0.3)', color: '#e91e63', padding: '4px 9px', borderRadius: 99 },

  // Main
  main: { background: '#1e293b', border: '1px solid #334155', borderRadius: 20, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' },

  // Form elements
  label:     { display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: '#94a3b8' },
  input:     { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: '15px', outline: 'none', boxSizing: 'border-box' },
  delBtn:    { position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.75)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: '10px' },
  mainBadge: { position: 'absolute', bottom: 5, left: 5, background: '#e91e63', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6 },
  uploadBox: { aspectRatio: '1/1', border: '2px dashed #334155', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '24px', color: '#64748b', background: '#0f172a' },

  // TCN Referral card (now in MAIN, after lifestyle)
  referralCard: { marginTop: 25, background: 'linear-gradient(135deg, #e91e63, #9c27b0)', padding: '30px 20px', borderRadius: 16, color: '#fff', textAlign: 'center', boxShadow: '0 8px 24px rgba(233, 30, 99, 0.3)' },

  saveBtn:   { width: '100%', padding: '18px', borderRadius: '30px', border: 'none', background: 'linear-gradient(135deg, #e91e63, #c2185b)', color: '#fff', fontWeight: 'bold', fontSize: '17px', marginTop: '30px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(233,30,99,0.4)' },
  langBtn:   { width: '100%', padding: '13px', borderRadius: '30px', border: '1.5px solid #334155', background: '#0f172a', color: '#e91e63', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  logoutBtn: { width: '100%', padding: '13px', borderRadius: '30px', border: '1.5px solid #334155', background: 'transparent', color: '#64748b', fontWeight: 'bold', fontSize: '14px', marginTop: '10px', cursor: 'pointer' },
  langPicker:{ position: 'absolute', bottom: '110%', left: 0, right: 0, background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', boxShadow: '0 -8px 30px rgba(0,0,0,0.5)', zIndex: 100, maxHeight: '280px', overflowY: 'auto', padding: '8px' },
  langOption:{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', textAlign: 'left' },
};