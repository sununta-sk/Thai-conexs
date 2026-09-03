import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { PROVINCES, getCitiesByProvince } from '../data/thaiLocations';
import PhotoCropper from '../components/PhotoCropper';
import { useIsDesktop } from '../hooks/useIsMobile';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Strips whitespace and any wrapping quote characters (straight and
// curly) from both ends, repeatedly. Only strips from the edges - a
// legitimate apostrophe mid-name (e.g. "O'Brien") is left alone. Fixes
// e.g. a literal `"k"` (quote marks included) getting saved verbatim.
function sanitizeUsername(raw) {
  let s = raw;
  let prev;
  do {
    prev = s;
    s = s.trim().replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, '');
  } while (s !== prev);
  return s;
}

const T = {
  th: {
    profilePhotos:'Profile Photos (max 10)', faceVerify:'ยืนยันตัวตน (Face Verification)',
    verifiedTitle:'ยืนยันตัวตนแล้ว', verifiedSub:'คุณสามารถส่งข้อความได้แล้ว',
    notVerifiedTitle:'ยังไม่ได้ยืนยันตัวตน', notVerifiedSub:'คุณจะส่งข้อความไม่ได้จนกว่าจะยืนยัน',
    verifyBtn:'🤖 ยืนยันด้วย AI', verifyingBtn:'🔍 AI กำลังตรวจสอบ...',
    uploadForVerify:'อัปโหลดรูปเพื่อยืนยัน', retakeBtn:'เลือกรูปใหม่',
    aboutYou:'เกี่ยวกับคุณ', username:'ชื่อผู้ใช้', bio:'แนะนำตัว',
    bodyEdu:'รูปร่างและการศึกษา', age:'อายุ', height:'ส่วนสูง (ซม.)', weight:'น้ำหนัก (กก.)',
    education:'การศึกษา', preferences:'ความต้องการ', gender:'เพศ', lookingFor:'มองหา',
    referralLabel:'กรอกรหัสเพื่อนเพื่อรับโบนัส €30',
    saveBtn:'บันทึกข้อมูลโปรไฟล์', logoutBtn:'ออกจากระบบ',
    continueBtn:'ไปที่หน้าค้นหา →', savingStatus:'กำลังบันทึก...', savedStatus:'บันทึกแล้ว ✓', errorStatus:'บันทึกไม่สำเร็จ กำลังลองใหม่...',
    eduOptions:['มัธยมศึกษา','ปริญญาตรี','ปริญญาโท','ปริญญาเอก'],
    genderOptions:['ชาย','หญิง','ทรานส์เจนเดอร์','อื่นๆ'], lookingOptions:['ผู้ชาย','ผู้หญิง','ทุกเพศ'],
    copyBtn:'📋 คัดลอกโค้ด', copiedBtn:'✅ คัดลอกแล้ว!',
    sidebarAbout:'เกี่ยวกับฉัน', sidebarInfo:'ข้อมูลส่วนตัว', sidebarLifestyle:'ไลฟ์สไตล์',
  },
  en: {
    profilePhotos:'Profile Photos (max 10)', faceVerify:'Get Your Verified Badge',
    verifiedTitle:'Identity Verified', verifiedSub:'You can now send messages',
    notVerifiedTitle:'Not Yet Verified', notVerifiedSub:'Your profile is almost complete! Verify your identity with AI to unlock your Verified Badge and stand out to other members.',
    verifyBtn:'🤖 Verify with AI', verifyingBtn:'🔍 AI is checking...',
    uploadForVerify:'Upload a photo to verify', retakeBtn:'Choose a different photo',
    aboutYou:'About You', username:'Username', bio:'Bio',
    bodyEdu:'Body & Education', age:'Age', height:'Height (cm)', weight:'Weight (kg)',
    education:'Education', preferences:'Preferences', gender:'Gender', lookingFor:'Looking For',
    referralLabel:"Enter a friend's code to get €30 bonus",
    saveBtn:'Save Profile', logoutBtn:'Logout',
    continueBtn:'Continue to Discover →', savingStatus:'Saving...', savedStatus:'Saved ✓', errorStatus:"Couldn't save — retrying...",
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
  const isDesktop = useIsDesktop();
  const verifyFileInputRef = useRef(null);

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
  const [capturedImage, setCapturedImage]   = useState(null);
  const [copied, setCopied]                 = useState(false);

  // Photo cropper state
  const [cropperImage, setCropperImage]     = useState(null); // data URL or http URL
  const [recropIndex, setRecropIndex]       = useState(null); // null=new upload, number=re-crop existing

  // ─── Auto-save ──────────────────────────────────────────────
  // Replaces the old "click Save Profile or lose everything" flow: ~9 real
  // users lost profile data (mainly photos) by filling the form and never
  // clicking Save. See saveProfileRef below for the actual persistence call.
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const readyRef          = useRef(false); // true only once fetchProfile() has populated state — guards against an empty initial render overwriting a real profile
  const skipPhotoEffectRef = useRef(true);  // swallow the effect's mount-time run (fetch itself sets photos/mainPhoto)
  const skipFieldEffectRef = useRef(true);  // same, for the debounced text/select group
  const fieldDebounceRef   = useRef(null);
  const errorRetryRef      = useRef(null);
  const savedStatusTimerRef = useRef(null);
  const saveProfileRef     = useRef(null); // always holds the latest save closure (see effect below) so any handler can call saveProfileRef.current?.()

  // Verification photo now comes from the regular file-upload path (the
  // same reliable native file/camera/gallery picker used for profile
  // photos elsewhere), not a dedicated getUserMedia() capture - see the
  // Part 2a investigation this replaced: no @capacitor/camera plugin is
  // installed, and a bare getUserMedia() call is not reliably granted
  // inside a packaged Capacitor WebView the way it is in a normal mobile
  // browser. handleVerify() itself is unchanged - it only ever consumed
  // capturedImage, regardless of how it got set.
  //
  // Worth knowing: this does weaken the original anti-spoofing intent of
  // requiring a *live* capture for verification (a live capture is harder
  // to fake than an arbitrary uploaded file - anyone could now "verify"
  // with any photo, not necessarily their own, which also triggers the
  // one-time referral commission payout in handleVerify()). Not a live
  // concern today since this whole section is still wrapped in
  // display:'none' below and unreachable by real users; worth revisiting
  // if this section is ever unhidden.
  const handleVerifyFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result);
      setVerifyResult(null);
      setVerifyMessage('');
    };
    reader.readAsDataURL(file);
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
      // Only now is it safe for autosave to react to state changes — before
      // this, "state changes" are just the fetch above populating the form,
      // not the user editing anything, and autosaving THAT would either be a
      // pointless no-op write (existing user) or — far worse — a blank
      // upsert that wipes a real profile (if this ran before fetch resolved).
      readyRef.current = true;
    }
    fetchProfile();
  }, []);

  // ─── Photo Upload Flow ──────────────────────────────────────
  // Step 1: User picks file → read as data URL → open cropper
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be selected again

    const reader = new FileReader();
    reader.onload = () => {
      setCropperImage(reader.result);
      setRecropIndex(null); // new upload, not re-crop
    };
    reader.readAsDataURL(file);
  };

  // Cancels a still-pending moderation-queue entry for a photo the user
  // removed from their own gallery (delete, recrop-replace, or the
  // ban-evasion auto-removal below) before ever saving it onto their
  // profile. Without this, the queue entry sits there forever — an admin
  // eventually reviews/approves it, but there's nothing left for it to
  // promote into, since the user already decided against that photo.
  // Only touches 'pending' rows — never removes an admin's existing
  // approve/reject decision. Fail open: never blocks the user's edit.
  const cancelQueueEntry = async (photoUrl) => {
    if (!photoUrl) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from('photo_moderation_queue')
        .delete()
        .eq('user_id', user.id)
        .eq('photo_url', photoUrl)
        .eq('status', 'pending');
    } catch {
      // Fail open — this is best-effort cleanup, not required for the edit to succeed.
    }
  };

  // Step 1b: User removes a photo from their gallery before saving
  const handleDeletePhoto = (index) => {
    const removed = photos[index];
    const remaining = photos.filter((_, idx) => idx !== index);
    setPhotos(remaining);
    if (removed?.url === mainPhoto) setMainPhoto(remaining[0]?.url || '');
    cancelQueueEntry(removed?.url);
  };

  // Step 2: User opens cropper for an existing photo
  const handleRecrop = (index) => {
    const photo = photos[index];
    if (!photo?.url) return;
    setCropperImage(photo.url);
    setRecropIndex(index);
  };

  // Step 3: Cropper save → upload Blob to storage
  const handleCropSave = async (blob) => {
    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      const filePath = `${user.id}/${Date.now()}_cropped.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      if (recropIndex !== null) {
        // Re-crop existing: replace photo at index
        const oldPhoto = photos[recropIndex];
        const wasMain = oldPhoto?.url === mainPhoto;
        setPhotos(prev => prev.map((p, i) =>
          i === recropIndex ? { url: publicUrl, cropX: 50, cropY: 50, scale: 1 } : p
        ));
        if (wasMain) setMainPhoto(publicUrl);
        cancelQueueEntry(oldPhoto?.url);
      } else {
        // New upload
        const isFirst = photos.length === 0;
        setPhotos(prev => [...prev, { url: publicUrl, cropX: 50, cropY: 50, scale: 1 }]);
        if (isFirst) setMainPhoto(publicUrl);

        await supabase.from('photo_moderation_queue').insert({
          user_id: user.id,
          photo_url: publicUrl,
          photo_bucket: 'avatars',
          status: 'pending',
          is_profile_photo: isFirst,
        });
      }

      setCropperImage(null);
      setRecropIndex(null);

      // Ban-evasion check against banned accounts' photo hashes (hash
      // comparison only, not face-matching AI) — runs AFTER the photo is
      // already saved and visible, not before. Measured at 1.6-2.4s+ per
      // call (jimp's pure-JS JPEG decode is slow) when it sat in front of
      // the upload, which was the primary suspect behind "photo not
      // uploading" reports. Consistent with how this app already handles
      // moderation elsewhere: photo_moderation_queue above is also reviewed
      // after the photo is already live, not before. Fail open on any error.
      (async () => {
        try {
          const imageBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          const checkRes = await fetch('/api/check-photo-hash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64 }),
          });
          const check = await checkRes.json();
          if (check?.blocked) {
            setPhotos(prev => prev.filter(p => p.url !== publicUrl));
            setMainPhoto(prev => (prev === publicUrl ? '' : prev));
            await supabase.storage.from('avatars').remove([filePath]);
            cancelQueueEntry(publicUrl);
            alert(lang === 'th' ? '⚠️ รูปนี้ถูกลบเนื่องจากตรงกับรูปของบัญชีที่ถูกระงับ' : '⚠️ This photo was removed — it matches one previously used by a banned account.');
          }
        } catch {
          // Fail open — never remove a legitimate photo if this check breaks.
        }
      })();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    setCropperImage(null);
    setRecropIndex(null);
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

  // The actual persistence call — same full-overwrite upsert shape
  // handleSave used to do, just no longer gated behind a button click.
  // Deliberately does NOT validate country/province/city: those stay
  // required for the "Continue to Discover" action below, but autosave
  // itself must never refuse to persist partial data (that refusal is
  // exactly how photo-only edits used to get lost). Confirmed via a
  // throwaway-user probe against the real DB that `profiles` accepts
  // null city/province/country on upsert.
  const doSaveProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaveStatus('saving');
    const cleanUsername = sanitizeUsername(username);
    if (cleanUsername !== username) setUsername(cleanUsername);
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, username: cleanUsername, bio, avatar_url: mainPhoto,
      photos, details, referral_code: myReferralCode,
      lifestyle,
      city: details.city || null,
      province: details.province || null,
      country: details.country || null,
      updated_at: new Date(),
      referred_by: friendCode.trim().toUpperCase() || null,
    }, { onConflict: 'id' });

    if (savedStatusTimerRef.current) clearTimeout(savedStatusTimerRef.current);
    if (errorRetryRef.current) clearTimeout(errorRetryRef.current);

    if (error) {
      console.error('Autosave failed:', error.message);
      setSaveStatus('error');
      // One best-effort retry — covers a transient blip without risking a
      // retry storm if Supabase is genuinely down (the next real edit will
      // naturally trigger another attempt regardless).
      errorRetryRef.current = setTimeout(() => { saveProfileRef.current?.(); }, 4000);
    } else {
      setSaveStatus('saved');
      savedStatusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Kept fresh every render so any handler — effects, blur, unload — can
  // call saveProfileRef.current?.() and always run against current state,
  // without re-deriving a dependency array for every field involved.
  useEffect(() => { saveProfileRef.current = doSaveProfile; });

  // Immediate save: photos + mainPhoto. This is the path that actually
  // matters for tonight's fix — a photo add/remove/recrop/re-main is now
  // persisted the moment it happens in local state, so it's never orphaned
  // by the user leaving before an explicit Save.
  useEffect(() => {
    if (skipPhotoEffectRef.current) { skipPhotoEffectRef.current = false; return; }
    if (!readyRef.current) return;
    saveProfileRef.current?.();
  }, [photos, mainPhoto]);

  // Debounced save: text fields, selects, chip toggles, referral code entry.
  // 900ms after the last change in this group; blur/tab-away/backgrounding
  // (below) flush it sooner so a quick "pick a dropdown value then leave"
  // doesn't get lost waiting on the timer.
  useEffect(() => {
    if (skipFieldEffectRef.current) { skipFieldEffectRef.current = false; return; }
    if (!readyRef.current) return;
    if (fieldDebounceRef.current) clearTimeout(fieldDebounceRef.current);
    fieldDebounceRef.current = setTimeout(() => { saveProfileRef.current?.(); }, 900);
    return () => clearTimeout(fieldDebounceRef.current);
  }, [username, bio, details, lifestyle, friendCode]);

  // Flush the pending debounce on blur (event delegation — see onBlur on the
  // Sidebar/MainContent wrappers below) and when the tab is backgrounded or
  // closed, so a debounced edit isn't stranded behind an unfired timer.
  const flushSave = () => {
    if (fieldDebounceRef.current) { clearTimeout(fieldDebounceRef.current); fieldDebounceRef.current = null; }
    saveProfileRef.current?.();
  };
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flushSave(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushSave);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flushSave);
    };
  }, []);

  const handleContinue = async () => {
    if (!details.country || !details.province || !details.city) {
      alert(lang === 'th' ? '⚠️ กรุณากรอก Country, Province และ City ให้ครบ' : '⚠️ Please fill Country, Province and City');
      return;
    }
    flushSave();
    navigate('/discover');
  };

  const referralDisabled = isVerified && !!friendCode;

  // Non-Thailand users get plain text inputs for state/province and city
  // (per client direction — the earlier country->state cascading dropdown was
  // overridden in favor of this simpler manual-entry approach).
  const isThailandLocation = !details.country || details.country === 'Thailand';

  // ──────────────────────────────────────────────
  // SIDEBAR (Desktop only)
  // ──────────────────────────────────────────────
  const Sidebar = (
    <div style={S.sidebar} onBlur={flushSave}>
      <div style={S.avatarWrap}>
        {mainPhoto ? (
          <img src={mainPhoto} alt="me" style={S.avatarImg} />
        ) : (
          <div style={S.avatarPlaceholder}>👤</div>
        )}
        {isVerified && <div style={S.verifiedRibbon}>✓ Verified</div>}
      </div>

      <div style={S.sidebarUsername}>{username || '—'}</div>

      {bio && (
        <div style={S.sidebarCard}>
          <div style={S.sidebarSection}>{tx.sidebarAbout}</div>
          <div style={S.sidebarBio}>{bio}</div>
        </div>
      )}

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
        <select value={details.country || ''} onChange={e => setDetails({...details, country: e.target.value, province: '', city: ''})} style={{ ...S.input, borderColor: details.country ? '#334155' : '#ef4444' }}>
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

      {isThailandLocation && (
        <>
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
        </>
      )}

      {!isThailandLocation && (
        <>
          <Field label={<span>{lang === 'th' ? 'รัฐ/จังหวัด' : 'State / Province'} <span style={{ color: '#ef4444' }}>*</span></span>}>
            <input
              value={details.province || ''}
              onChange={e => setDetails({...details, province: e.target.value})}
              placeholder={lang === 'th' ? 'รัฐ/จังหวัด' : 'State / Province'}
              style={{ ...S.input, borderColor: details.province ? '#334155' : '#ef4444' }}
            />
            {!details.province && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{lang === 'th' ? 'กรุณากรอกรัฐ/จังหวัด' : 'Required: please enter your state/province'}</div>}
          </Field>

          <Field label={<span>{lang === 'th' ? 'เมือง' : 'City'} <span style={{ color: '#ef4444' }}>*</span></span>}>
            <input
              value={details.city || ''}
              onChange={e => setDetails({...details, city: e.target.value})}
              placeholder={lang === 'th' ? 'เมือง' : 'City'}
              style={{ ...S.input, borderColor: details.city ? '#334155' : '#ef4444' }}
            />
            {!details.city && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{lang === 'th' ? 'กรุณากรอกชื่อเมือง' : 'Required: please enter your city'}</div>}
          </Field>
        </>
      )}

      <Field label="Preferred age range">
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" placeholder="Min age" value={details.preferred_age_min || ''} onChange={e => setDetails({...details, preferred_age_min: e.target.value})} style={S.input} />
          <input type="number" placeholder="Max age" value={details.preferred_age_max || ''} onChange={e => setDetails({...details, preferred_age_max: e.target.value})} style={S.input} />
        </div>
      </Field>
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
    <div style={S.main} onBlur={flushSave}>
      {saveStatus !== 'idle' && (
        <div style={{
          ...S.saveToast,
          background: saveStatus === 'error' ? 'rgba(239,68,68,0.15)' : saveStatus === 'saving' ? 'rgba(148,163,184,0.15)' : 'rgba(74,222,128,0.15)',
          border: `1px solid ${saveStatus === 'error' ? 'rgba(239,68,68,0.4)' : saveStatus === 'saving' ? 'rgba(148,163,184,0.4)' : 'rgba(74,222,128,0.4)'}`,
          color: saveStatus === 'error' ? '#f87171' : saveStatus === 'saving' ? '#cbd5e1' : '#4ade80',
        }}>
          {saveStatus === 'saving' ? tx.savingStatus : saveStatus === 'error' ? tx.errorStatus : tx.savedStatus}
        </div>
      )}
      {/* Profile Photos */}
      <SectionTitle>{tx.profilePhotos}</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {photos.map((p, i) => (
          <div key={i} style={{ aspectRatio: '4/5', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: p.url === mainPhoto ? '3px solid #e91e63' : '1px solid #334155' }}>
            <img src={p.url} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setMainPhoto(p.url)} />
            <button onClick={() => handleDeletePhoto(i)} style={S.delBtn}>✕</button>
            <button onClick={() => handleRecrop(i)} style={S.recropBtn} title="Re-crop">✂</button>
            {p.url === mainPhoto && <div style={S.mainBadge}>Main</div>}
          </div>
        ))}
        {photos.length < 10 && (
          <label style={S.uploadBox}>
            <input type="file" hidden onChange={handleFileSelect} accept="image/*" />
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
          <input type="file" ref={verifyFileInputRef} hidden onChange={handleVerifyFileSelect} accept="image/*" />
          {capturedImage && (
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <img src={capturedImage} style={{ width: '120px', height: '120px', borderRadius: '60px', objectFit: 'cover', border: '3px solid #fbbf24' }} />
            </div>
          )}
          {verifyResult === 'pass' && <div style={{ background: 'rgba(34, 197, 94, 0.15)', borderRadius: '10px', padding: '10px', marginBottom: '10px', color: '#4ade80', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>✅ {verifyMessage}</div>}
          {verifyResult === 'fail' && <div style={{ background: 'rgba(239, 68, 68, 0.15)', borderRadius: '10px', padding: '10px', marginBottom: '10px', color: '#f87171', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>❌ {verifyMessage}</div>}
          {!capturedImage && (
            <button onClick={() => verifyFileInputRef.current?.click()} style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #e91e63, #c2185b)', color: '#fff', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
              📷 {tx.uploadForVerify}
            </button>
          )}
          {capturedImage && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleVerify} disabled={verifying} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: verifying ? '#334155' : 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff', fontWeight: 'bold', fontSize: '15px', cursor: verifying ? 'not-allowed' : 'pointer' }}>
                {verifying ? tx.verifyingBtn : tx.verifyBtn}
              </button>
              <button onClick={() => verifyFileInputRef.current?.click()} style={{ padding: '13px 16px', borderRadius: '12px', border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', fontWeight: 'bold', cursor: 'pointer' }}>🔄 {tx.retakeBtn}</button>
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

      {/* Location — duplicated from Sidebar so mobile users can fill required fields */}
      <SectionTitle>📍 Location</SectionTitle>
      <Field label={<span>Country <span style={{ color: '#ef4444' }}>*</span></span>}>
        <select value={details.country || ''} onChange={e => setDetails({...details, country: e.target.value, province: '', city: ''})} style={{ ...S.input, borderColor: details.country ? '#334155' : '#ef4444' }}>
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

      {isThailandLocation && (
        <>
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
        </>
      )}

      {!isThailandLocation && (
        <>
          <Field label={<span>{lang === 'th' ? 'รัฐ/จังหวัด' : 'State / Province'} <span style={{ color: '#ef4444' }}>*</span></span>}>
            <input
              value={details.province || ''}
              onChange={e => setDetails({...details, province: e.target.value})}
              placeholder={lang === 'th' ? 'รัฐ/จังหวัด' : 'State / Province'}
              style={{ ...S.input, borderColor: details.province ? '#334155' : '#ef4444' }}
            />
            {!details.province && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{lang === 'th' ? 'กรุณากรอกรัฐ/จังหวัด' : 'Required: please enter your state/province'}</div>}
          </Field>

          <Field label={<span>{lang === 'th' ? 'เมือง' : 'City'} <span style={{ color: '#ef4444' }}>*</span></span>}>
            <input
              value={details.city || ''}
              onChange={e => setDetails({...details, city: e.target.value})}
              placeholder={lang === 'th' ? 'เมือง' : 'City'}
              style={{ ...S.input, borderColor: details.city ? '#334155' : '#ef4444' }}
            />
            {!details.city && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{lang === 'th' ? 'กรุณากรอกชื่อเมือง' : 'Required: please enter your city'}</div>}
          </Field>
        </>
      )}

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

      <button onClick={handleContinue} style={S.saveBtn}>{tx.continueBtn}</button>

      <button onClick={() => navigate('/payout')} style={{ width: '100%', padding: '14px', borderRadius: '30px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', fontWeight: 800, fontSize: '15px', marginTop: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
        💸 {lang === 'th' ? 'ถอนเงิน / Request Payout' : 'Request Payout'} · €{balance}
      </button>


      <button onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }} style={S.logoutBtn}>
        {tx.logoutBtn}
      </button>
    </div>
  );

  // ──────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────
  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', paddingBottom: '120px', paddingTop: isDesktop ? '90px' : '0px' }}>
      <div style={isDesktop ? S.desktopWrap : S.mobileWrap}>
        {isDesktop ? (
          <>
            {Sidebar}
            {MainContent}
          </>
        ) : (
          <>
            {MainContent}
          </>
        )}
      </div>

      {/* Photo Cropper Modal */}
      {cropperImage && (
        <PhotoCropper
          imageSrc={cropperImage}
          onCancel={handleCropCancel}
          onSave={handleCropSave}
        />
      )}
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
  avatarWrap: { position: 'relative', width: '100%', aspectRatio: '4/5', borderRadius: 16, overflow: 'hidden', background: '#0f172a', border: '1px solid #334155' },
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
  delBtn:    { position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.75)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1 },
  recropBtn: { position: 'absolute', top: 5, left: 5, background: 'rgba(233, 30, 99, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1, boxShadow: '0 2px 6px rgba(0,0,0,0.4)' },
  mainBadge: { position: 'absolute', bottom: 5, left: 5, background: '#e91e63', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6 },
  uploadBox: { aspectRatio: '4/5', border: '2px dashed #334155', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '24px', color: '#64748b', background: '#0f172a' },

  // TCN Referral card
  referralCard: { marginTop: 25, background: 'linear-gradient(135deg, #e91e63, #9c27b0)', padding: '30px 20px', borderRadius: 16, color: '#fff', textAlign: 'center', boxShadow: '0 8px 24px rgba(233, 30, 99, 0.3)' },

  saveBtn:   { width: '100%', padding: '18px', borderRadius: '30px', border: 'none', background: 'linear-gradient(135deg, #e91e63, #c2185b)', color: '#fff', fontWeight: 'bold', fontSize: '17px', marginTop: '30px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(233,30,99,0.4)' },
  saveToast: {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '14px 28px',
    borderRadius: 16,
    fontSize: 15,
    fontWeight: 800,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    zIndex: 3000,
    textAlign: 'center',
    transition: 'opacity 0.2s',
  },
  langBtn:   { width: '100%', padding: '13px', borderRadius: '30px', border: '1.5px solid #334155', background: '#0f172a', color: '#e91e63', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  logoutBtn: { width: '100%', padding: '13px', borderRadius: '30px', border: '1.5px solid #334155', background: 'transparent', color: '#64748b', fontWeight: 'bold', fontSize: '14px', marginTop: '10px', cursor: 'pointer' },
  langPicker:{ position: 'absolute', bottom: '110%', left: 0, right: 0, background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', boxShadow: '0 -8px 30px rgba(0,0,0,0.5)', zIndex: 100, maxHeight: '280px', overflowY: 'auto', padding: '8px' },
  langOption:{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', textAlign: 'left' },
};
