import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const LANGUAGES = [
  { code: 'th', label: '🇹🇭 ภาษาไทย' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'zh', label: '🇨🇳 中文 (Chinese)' },
  { code: 'ja', label: '🇯🇵 日本語 (Japanese)' },
  { code: 'ko', label: '🇰🇷 한국어 (Korean)' },
  { code: 'fr', label: '🇫🇷 Français (French)' },
  { code: 'de', label: '🇩🇪 Deutsch (German)' },
  { code: 'es', label: '🇪🇸 Español (Spanish)' },
  { code: 'it', label: '🇮🇹 Italiano (Italian)' },
  { code: 'pt', label: '🇧🇷 Português (Portuguese)' },
  { code: 'ru', label: '🇷🇺 Русский (Russian)' },
  { code: 'ar', label: '🇸🇦 العربية (Arabic)' },
  { code: 'hi', label: '🇮🇳 हिन्दी (Hindi)' },
  { code: 'vi', label: '🇻🇳 Tiếng Việt (Vietnamese)' },
  { code: 'id', label: '🇮🇩 Bahasa Indonesia' },
  { code: 'ms', label: '🇲🇾 Bahasa Melayu' },
];

const T = {
  th: {
    profilePhotos:'รูปโปรไฟล์ (สูงสุด 6 รูป)', faceVerify:'ยืนยันตัวตน (Face Verification)',
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
  },
  en: {
    profilePhotos:'Profile Photos (max 6)', faceVerify:'Identity Verification',
    verifiedTitle:'Identity Verified', verifiedSub:'You can now send messages',
    notVerifiedTitle:'Not Yet Verified', notVerifiedSub:'Verify your identity to send messages',
    verifyBtn:'🤖 Verify with AI', verifyingBtn:'🔍 AI is checking...',
    aboutYou:'About You', username:'Username', bio:'Bio',
    bodyEdu:'Body & Education', age:'Age', height:'Height (cm)', weight:'Weight (kg)',
    education:'Education', preferences:'Preferences', gender:'Gender', lookingFor:'Looking For',
    referralLabel:"Enter a friend's code to get €30 bonus",
    saveBtn:'Save Profile', logoutBtn:'Logout',
    eduOptions:['High School','Bachelor Degree','Master Degree','PhD'],
    genderOptions:['Male','Female','Other'], lookingOptions:['Men','Women','Everyone'],
    copyBtn:'📋 Copy Code', copiedBtn:'✅ Copied!',
  },
  zh: {
    profilePhotos:'个人照片（最多6张）', faceVerify:'身份验证',
    verifiedTitle:'已完成身份验证', verifiedSub:'您现在可以发送消息',
    notVerifiedTitle:'尚未验证', notVerifiedSub:'验证后才能发送消息',
    verifyBtn:'🤖 AI验证', verifyingBtn:'🔍 AI检测中...',
    aboutYou:'关于你', username:'用户名', bio:'个人简介',
    bodyEdu:'体型与教育', age:'年龄', height:'身高 (厘米)', weight:'体重 (千克)',
    education:'学历', preferences:'偏好', gender:'性别', lookingFor:'寻找',
    referralLabel:'输入好友码获得€30奖励',
    saveBtn:'保存资料', logoutBtn:'退出登录',
    eduOptions:['高中','学士学位','硕士学位','博士学位'],
    genderOptions:['男','女','其他'], lookingOptions:['男性','女性','所有人'],
    copyBtn:'📋 复制代码', copiedBtn:'✅ 已复制！',
  },
  ja: {
    profilePhotos:'プロフィール写真（最大6枚）', faceVerify:'本人確認（顔認証）',
    verifiedTitle:'本人確認済み', verifiedSub:'メッセージを送信できます',
    notVerifiedTitle:'未確認', notVerifiedSub:'確認完了後にメッセージを送信できます',
    verifyBtn:'🤖 AIで確認', verifyingBtn:'🔍 AI確認中...',
    aboutYou:'自己紹介', username:'ユーザー名', bio:'自己PR',
    bodyEdu:'体型・学歴', age:'年齢', height:'身長 (cm)', weight:'体重 (kg)',
    education:'学歴', preferences:'希望条件', gender:'性別', lookingFor:'探している相手',
    referralLabel:'友達コードを入力して€30ボーナスを獲得',
    saveBtn:'プロフィールを保存', logoutBtn:'ログアウト',
    eduOptions:['高校','学士号','修士号','博士号'],
    genderOptions:['男性','女性','その他'], lookingOptions:['男性','女性','全員'],
    copyBtn:'📋 コードをコピー', copiedBtn:'✅ コピーしました！',
  },
  ko: {
    profilePhotos:'프로필 사진 (최대 6장)', faceVerify:'본인 인증',
    verifiedTitle:'인증 완료', verifiedSub:'이제 메시지를 보낼 수 있습니다',
    notVerifiedTitle:'미인증', notVerifiedSub:'인증 후 메시지를 보낼 수 있습니다',
    verifyBtn:'🤖 AI로 인증', verifyingBtn:'🔍 AI 확인 중...',
    aboutYou:'나에 대해', username:'사용자 이름', bio:'자기소개',
    bodyEdu:'체형 및 학력', age:'나이', height:'키 (cm)', weight:'몸무게 (kg)',
    education:'학력', preferences:'선호도', gender:'성별', lookingFor:'찾는 상대',
    referralLabel:'친구 코드 입력으로 €30 보너스 받기',
    saveBtn:'프로필 저장', logoutBtn:'로그아웃',
    eduOptions:['고등학교','학사','석사','박사'],
    genderOptions:['남성','여성','기타'], lookingOptions:['남성','여성','모두'],
    copyBtn:'📋 코드 복사', copiedBtn:'✅ 복사됨!',
  },
  fr: {
    profilePhotos:'Photos de profil (max 6)', faceVerify:"Vérification d'identité",
    verifiedTitle:'Identité vérifiée', verifiedSub:'Vous pouvez maintenant envoyer des messages',
    notVerifiedTitle:'Non vérifié', notVerifiedSub:'Vérifiez votre identité pour envoyer des messages',
    verifyBtn:'🤖 Vérifier avec IA', verifyingBtn:'🔍 IA en cours...',
    aboutYou:'À propos de vous', username:"Nom d'utilisateur", bio:'Bio',
    bodyEdu:'Corps et éducation', age:'Âge', height:'Taille (cm)', weight:'Poids (kg)',
    education:'Éducation', preferences:'Préférences', gender:'Genre', lookingFor:'Recherche',
    referralLabel:"Entrez le code d'un ami pour €30 de bonus",
    saveBtn:'Enregistrer le profil', logoutBtn:'Déconnexion',
    eduOptions:['Lycée','Licence','Master','Doctorat'],
    genderOptions:['Homme','Femme','Autre'], lookingOptions:['Hommes','Femmes','Tout le monde'],
    copyBtn:'📋 Copier le code', copiedBtn:'✅ Copié !',
  },
  de: {
    profilePhotos:'Profilfotos (max. 6)', faceVerify:'Identitätsverifizierung',
    verifiedTitle:'Identität bestätigt', verifiedSub:'Sie können jetzt Nachrichten senden',
    notVerifiedTitle:'Nicht verifiziert', notVerifiedSub:'Bitte verifizieren Sie sich um Nachrichten zu senden',
    verifyBtn:'🤖 Mit KI verifizieren', verifyingBtn:'🔍 KI prüft...',
    aboutYou:'Über Sie', username:'Benutzername', bio:'Biografie',
    bodyEdu:'Körper & Bildung', age:'Alter', height:'Größe (cm)', weight:'Gewicht (kg)',
    education:'Bildung', preferences:'Präferenzen', gender:'Geschlecht', lookingFor:'Suche nach',
    referralLabel:'Freundescode eingeben für €30 Bonus',
    saveBtn:'Profil speichern', logoutBtn:'Abmelden',
    eduOptions:['Gymnasium','Bachelor','Master','Doktor'],
    genderOptions:['Männlich','Weiblich','Andere'], lookingOptions:['Männer','Frauen','Alle'],
    copyBtn:'📋 Code kopieren', copiedBtn:'✅ Kopiert!',
  },
  es: {
    profilePhotos:'Fotos de perfil (máx. 6)', faceVerify:'Verificación de identidad',
    verifiedTitle:'Identidad verificada', verifiedSub:'Ya puedes enviar mensajes',
    notVerifiedTitle:'No verificado', notVerifiedSub:'Verifica tu identidad para enviar mensajes',
    verifyBtn:'🤖 Verificar con IA', verifyingBtn:'🔍 IA verificando...',
    aboutYou:'Sobre ti', username:'Nombre de usuario', bio:'Biografía',
    bodyEdu:'Cuerpo y educación', age:'Edad', height:'Altura (cm)', weight:'Peso (kg)',
    education:'Educación', preferences:'Preferencias', gender:'Género', lookingFor:'Buscando',
    referralLabel:'Ingresa el código de un amigo para €30 de bono',
    saveBtn:'Guardar perfil', logoutBtn:'Cerrar sesión',
    eduOptions:['Bachillerato','Licenciatura','Maestría','Doctorado'],
    genderOptions:['Hombre','Mujer','Otro'], lookingOptions:['Hombres','Mujeres','Todos'],
    copyBtn:'📋 Copiar código', copiedBtn:'✅ ¡Copiado!',
  },
  it: {
    profilePhotos:'Foto profilo (max 6)', faceVerify:'Verifica identità',
    verifiedTitle:'Identità verificata', verifiedSub:'Ora puoi inviare messaggi',
    notVerifiedTitle:'Non verificato', notVerifiedSub:"Verifica la tua identità per inviare messaggi",
    verifyBtn:'🤖 Verifica con IA', verifyingBtn:'🔍 IA in verifica...',
    aboutYou:'Su di te', username:'Nome utente', bio:'Bio',
    bodyEdu:'Corpo e istruzione', age:'Età', height:'Altezza (cm)', weight:'Peso (kg)',
    education:'Istruzione', preferences:'Preferenze', gender:'Genere', lookingFor:'Cerco',
    referralLabel:"Inserisci il codice di un amico per €30 di bonus",
    saveBtn:'Salva profilo', logoutBtn:'Esci',
    eduOptions:['Liceo','Laurea triennale','Laurea magistrale','Dottorato'],
    genderOptions:['Uomo','Donna','Altro'], lookingOptions:['Uomini','Donne','Tutti'],
    copyBtn:'📋 Copia codice', copiedBtn:'✅ Copiato!',
  },
  pt: {
    profilePhotos:'Fotos do perfil (máx. 6)', faceVerify:'Verificação de identidade',
    verifiedTitle:'Identidade verificada', verifiedSub:'Agora você pode enviar mensagens',
    notVerifiedTitle:'Não verificado', notVerifiedSub:'Verifique sua identidade para enviar mensagens',
    verifyBtn:'🤖 Verificar com IA', verifyingBtn:'🔍 IA verificando...',
    aboutYou:'Sobre você', username:'Nome de usuário', bio:'Bio',
    bodyEdu:'Corpo e educação', age:'Idade', height:'Altura (cm)', weight:'Peso (kg)',
    education:'Educação', preferences:'Preferências', gender:'Gênero', lookingFor:'Procurando',
    referralLabel:'Insira o código de um amigo para €30 de bônus',
    saveBtn:'Salvar perfil', logoutBtn:'Sair',
    eduOptions:['Ensino Médio','Bacharelado','Mestrado','Doutorado'],
    genderOptions:['Masculino','Feminino','Outro'], lookingOptions:['Homens','Mulheres','Todos'],
    copyBtn:'📋 Copiar código', copiedBtn:'✅ Copiado!',
  },
  ru: {
    profilePhotos:'Фото профиля (макс. 6)', faceVerify:'Верификация личности',
    verifiedTitle:'Личность подтверждена', verifiedSub:'Теперь вы можете отправлять сообщения',
    notVerifiedTitle:'Не верифицирован', notVerifiedSub:'Пройдите верификацию для отправки сообщений',
    verifyBtn:'🤖 Верифицировать с ИИ', verifyingBtn:'🔍 ИИ проверяет...',
    aboutYou:'О вас', username:'Имя пользователя', bio:'О себе',
    bodyEdu:'Внешность и образование', age:'Возраст', height:'Рост (см)', weight:'Вес (кг)',
    education:'Образование', preferences:'Предпочтения', gender:'Пол', lookingFor:'Ищу',
    referralLabel:'Введите код друга и получите €30 бонус',
    saveBtn:'Сохранить профиль', logoutBtn:'Выйти',
    eduOptions:['Школа','Бакалавр','Магистр','Доктор'],
    genderOptions:['Мужской','Женский','Другой'], lookingOptions:['Мужчин','Женщин','Всех'],
    copyBtn:'📋 Копировать код', copiedBtn:'✅ Скопировано!',
  },
  ar: {
    profilePhotos:'صور الملف الشخصي (حتى 6)', faceVerify:'التحقق من الهوية',
    verifiedTitle:'تم التحقق من الهوية', verifiedSub:'يمكنك الآن إرسال الرسائل',
    notVerifiedTitle:'غير موثق', notVerifiedSub:'تحقق من هويتك لإرسال الرسائل',
    verifyBtn:'🤖 التحقق بالذكاء الاصطناعي', verifyingBtn:'🔍 جارٍ التحقق...',
    aboutYou:'نبذة عنك', username:'اسم المستخدم', bio:'نبذة شخصية',
    bodyEdu:'الجسم والتعليم', age:'العمر', height:'الطول (سم)', weight:'الوزن (كج)',
    education:'التعليم', preferences:'التفضيلات', gender:'الجنس', lookingFor:'أبحث عن',
    referralLabel:'أدخل كود صديق للحصول على €30 مكافأة',
    saveBtn:'حفظ الملف الشخصي', logoutBtn:'تسجيل الخروج',
    eduOptions:['ثانوية','بكالوريوس','ماجستير','دكتوراه'],
    genderOptions:['ذكر','أنثى','آخر'], lookingOptions:['رجال','نساء','الجميع'],
    copyBtn:'📋 نسخ الكود', copiedBtn:'✅ تم النسخ!',
  },
  hi: {
    profilePhotos:'प्रोफ़ाइल फ़ोटो (अधिकतम 6)', faceVerify:'पहचान सत्यापन',
    verifiedTitle:'पहचान सत्यापित', verifiedSub:'अब आप संदेश भेज सकते हैं',
    notVerifiedTitle:'सत्यापित नहीं', notVerifiedSub:'संदेश भेजने के लिए सत्यापन करें',
    verifyBtn:'🤖 AI से सत्यापित करें', verifyingBtn:'🔍 AI जाँच रहा है...',
    aboutYou:'आपके बारे में', username:'उपयोगकर्ता नाम', bio:'परिचय',
    bodyEdu:'शरीर और शिक्षा', age:'आयु', height:'ऊंचाई (सेमी)', weight:'वजन (किग्रा)',
    education:'शिक्षा', preferences:'प्राथमिकताएं', gender:'लिंग', lookingFor:'खोज रहे हैं',
    referralLabel:'मित्र कोड दर्ज करें और €30 बोनस पाएं',
    saveBtn:'प्रोफ़ाइल सहेजें', logoutBtn:'लॉग आउट',
    eduOptions:['हाई स्कूल','स्नातक','स्नातकोत्तर','पीएचडी'],
    genderOptions:['पुरुष','महिला','अन्य'], lookingOptions:['पुरुष','महिला','सभी'],
    copyBtn:'📋 कोड कॉपी करें', copiedBtn:'✅ कॉपी हो गया!',
  },
  vi: {
    profilePhotos:'Ảnh hồ sơ (tối đa 6)', faceVerify:'Xác minh danh tính',
    verifiedTitle:'Đã xác minh', verifiedSub:'Bạn có thể gửi tin nhắn ngay bây giờ',
    notVerifiedTitle:'Chưa xác minh', notVerifiedSub:'Xác minh danh tính để gửi tin nhắn',
    verifyBtn:'🤖 Xác minh bằng AI', verifyingBtn:'🔍 AI đang kiểm tra...',
    aboutYou:'Về bạn', username:'Tên người dùng', bio:'Giới thiệu',
    bodyEdu:'Vóc dáng & Học vấn', age:'Tuổi', height:'Chiều cao (cm)', weight:'Cân nặng (kg)',
    education:'Học vấn', preferences:'Sở thích', gender:'Giới tính', lookingFor:'Tìm kiếm',
    referralLabel:'Nhập mã giới thiệu để nhận €30 thưởng',
    saveBtn:'Lưu hồ sơ', logoutBtn:'Đăng xuất',
    eduOptions:['THPT','Đại học','Thạc sĩ','Tiến sĩ'],
    genderOptions:['Nam','Nữ','Khác'], lookingOptions:['Nam','Nữ','Tất cả'],
    copyBtn:'📋 Sao chép mã', copiedBtn:'✅ Đã sao chép!',
  },
  id: {
    profilePhotos:'Foto Profil (maks. 6)', faceVerify:'Verifikasi Identitas',
    verifiedTitle:'Identitas Terverifikasi', verifiedSub:'Anda sekarang dapat mengirim pesan',
    notVerifiedTitle:'Belum Terverifikasi', notVerifiedSub:'Verifikasi diri untuk mengirim pesan',
    verifyBtn:'🤖 Verifikasi dengan AI', verifyingBtn:'🔍 AI sedang memeriksa...',
    aboutYou:'Tentang Anda', username:'Nama Pengguna', bio:'Bio',
    bodyEdu:'Tubuh & Pendidikan', age:'Usia', height:'Tinggi (cm)', weight:'Berat (kg)',
    education:'Pendidikan', preferences:'Preferensi', gender:'Jenis Kelamin', lookingFor:'Mencari',
    referralLabel:'Masukkan kode teman untuk bonus €30',
    saveBtn:'Simpan Profil', logoutBtn:'Keluar',
    eduOptions:['SMA','Sarjana','Magister','Doktor'],
    genderOptions:['Laki-laki','Perempuan','Lainnya'], lookingOptions:['Laki-laki','Perempuan','Semua'],
    copyBtn:'📋 Salin kode', copiedBtn:'✅ Tersalin!',
  },
  ms: {
    profilePhotos:'Foto Profil (maks. 6)', faceVerify:'Pengesahan Identiti',
    verifiedTitle:'Identiti Disahkan', verifiedSub:'Anda boleh menghantar mesej sekarang',
    notVerifiedTitle:'Belum Disahkan', notVerifiedSub:'Sahkan identiti untuk menghantar mesej',
    verifyBtn:'🤖 Sahkan dengan AI', verifyingBtn:'🔍 AI sedang memeriksa...',
    aboutYou:'Tentang Anda', username:'Nama Pengguna', bio:'Bio',
    bodyEdu:'Badan & Pendidikan', age:'Umur', height:'Tinggi (cm)', weight:'Berat (kg)',
    education:'Pendidikan', preferences:'Keutamaan', gender:'Jantina', lookingFor:'Mencari',
    referralLabel:'Masukkan kod rakan untuk bonus €30',
    saveBtn:'Simpan Profil', logoutBtn:'Log Keluar',
    eduOptions:['Sekolah Menengah','Sarjana Muda','Sarjana','Doktor'],
    genderOptions:['Lelaki','Perempuan','Lain-lain'], lookingOptions:['Lelaki','Perempuan','Semua'],
    copyBtn:'📋 Salin kod', copiedBtn:'✅ Disalin!',
  },
};

function dataURLtoBlob(dataURL) {
  const base64Data = dataURL.split(',')[1];
  const byteCharacters = atob(base64Data);
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) byteArray[i] = byteCharacters.charCodeAt(i);
  return new Blob([byteArray], { type: 'image/jpeg' });
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  const [username, setUsername]   = useState('');
  const [bio, setBio]             = useState('');
  const [photos, setPhotos]       = useState([]);
  const [mainPhoto, setMainPhoto] = useState('');
  const [uploading, setUploading] = useState(false);
  // ── เพิ่ม age ──────────────────────────────────────────────────────────────
  const [details, setDetails] = useState({ age:'', height:'', weight:'', education:'', gender:'', lookingFor:'' });
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
  const [preferredLang, setPreferredLang]   = useState('en');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [copied, setCopied]                 = useState(false);

  const openCamera = async () => {
    setCameraError(''); setCapturedImage(null); setVerifyResult(null); setVerifyMessage('');
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false });
      streamRef.current = stream;
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch (err) {
      setCameraError('ไม่สามารถเปิดกล้องได้: ' + err.message);
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

  const tx = T[preferredLang] || T['en'];

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
        setPreferredLang(data.preferred_lang || 'en');
        setFriendCode(data.referred_by || '');
        if (data.details) setDetails(prev => ({ ...prev, ...data.details }));
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
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
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
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, username, bio, avatar_url: mainPhoto,
      photos, details, referral_code: myReferralCode,
      preferred_lang: preferredLang, updated_at: new Date(),
      referred_by: friendCode.trim().toUpperCase() || null,
    });
    if (!error) {
      alert('✅ ' + tx.saveBtn);
      navigate('/discover');
    }
  };

  const selectedLang = LANGUAGES.find(l => l.code === preferredLang);
  const referralDisabled = isVerified && !!friendCode;

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', paddingBottom: '120px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', background: '#fff', borderRadius: '0 0 30px 30px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

        <div style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', padding: '40px 20px', color: '#fff', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.8, fontWeight: 'bold' }}>TCN REFERRAL SYSTEM</p>
          <h2 style={{ margin: '5px 0', fontSize: '32px', fontWeight: '900' }}>{myReferralCode}</h2>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', padding: '5px 15px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
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

        <div style={{ padding: '20px' }}>

          <SectionTitle>{tx.profilePhotos}</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
            {photos.map((p, i) => (
              <div key={i} style={{ aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: p.url === mainPhoto ? '3px solid #a855f7' : '1px solid #e2e8f0' }}>
                <img src={p.url} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setMainPhoto(p.url)} />
                <button onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} style={S.delBtn}>✕</button>
              </div>
            ))}
            {photos.length < 6 && (
              <label style={S.uploadBox}>
                <input type="file" hidden onChange={handleUpload} accept="image/*" />{uploading ? '...' : '+'}
              </label>
            )}
          </div>

          <SectionTitle>{tx.faceVerify}</SectionTitle>
          {isVerified ? (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '28px' }}>✅</span>
              <div>
                <div style={{ fontWeight: 'bold', color: '#16a34a', fontSize: '15px' }}>{tx.verifiedTitle}</div>
                <div style={{ fontSize: '13px', color: '#4ade80' }}>{tx.verifiedSub}</div>
              </div>
            </div>
          ) : (
            <div style={{ background: '#fef9c3', border: '1.5px solid #fde047', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#92400e', fontSize: '14px' }}>{tx.notVerifiedTitle}</div>
                  <div style={{ fontSize: '12px', color: '#a16207' }}>{tx.notVerifiedSub}</div>
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
              {cameraError && <div style={{ background: '#fee2e2', borderRadius: '10px', padding: '10px', marginBottom: '10px', color: '#dc2626', fontSize: '13px', textAlign: 'center' }}>❌ {cameraError}</div>}
              {verifyResult === 'pass' && <div style={{ background: '#dcfce7', borderRadius: '10px', padding: '10px', marginBottom: '10px', color: '#15803d', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>✅ {verifyMessage}</div>}
              {verifyResult === 'fail' && <div style={{ background: '#fee2e2', borderRadius: '10px', padding: '10px', marginBottom: '10px', color: '#dc2626', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>❌ {verifyMessage}</div>}
              {!cameraOpen && !capturedImage && (
                <button onClick={openCamera} style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                  📷 เปิดกล้องถ่ายรูป
                </button>
              )}
              {cameraOpen && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={capturePhoto} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>📸 ถ่ายภาพ</button>
                  <button onClick={closeCamera} style={{ padding: '13px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>ยกเลิก</button>
                </div>
              )}
              {capturedImage && !cameraOpen && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleVerify} disabled={verifying} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: verifying ? '#d1d5db' : 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff', fontWeight: 'bold', fontSize: '15px', cursor: verifying ? 'not-allowed' : 'pointer' }}>
                    {verifying ? tx.verifyingBtn : tx.verifyBtn}
                  </button>
                  <button onClick={openCamera} style={{ padding: '13px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>🔄 ถ่ายใหม่</button>
                </div>
              )}
            </div>
          )}

          <SectionTitle>{tx.aboutYou}</SectionTitle>
          <Field label={tx.username}><input value={username} onChange={e => setUsername(e.target.value)} style={S.input} /></Field>
          <Field label={tx.bio}><textarea value={bio} onChange={e => setBio(e.target.value)} style={{ ...S.input, height: '80px', resize: 'none' }} /></Field>

          <SectionTitle>{tx.bodyEdu}</SectionTitle>
          {/* ── age + height + weight ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <Field label={tx.age}>
              <input
                type="number" min="18" max="99"
                placeholder="25"
                value={details.age}
                onChange={e => setDetails({...details, age: e.target.value})}
                style={S.input}
              />
            </Field>
            <Field label={tx.height}><input value={details.height} onChange={e => setDetails({...details, height: e.target.value})} style={S.input} /></Field>
            <Field label={tx.weight}><input value={details.weight} onChange={e => setDetails({...details, weight: e.target.value})} style={S.input} /></Field>
          </div>
          <Field label={tx.education}>
            <select value={details.education} onChange={e => setDetails({...details, education: e.target.value})} style={S.input}>
              <option value="">—</option>
              {tx.eduOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>

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

          <div style={{ marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '15px', border: '1px dashed #cbd5e1' }}>
            <label style={S.label}>{tx.referralLabel}</label>
            <input
              placeholder="TCN-XXXX"
              value={friendCode}
              onChange={e => setFriendCode(e.target.value)}
              disabled={referralDisabled}
              style={{ ...S.input, opacity: referralDisabled ? 0.5 : 1 }}
            />
            {referralDisabled && <p style={{ fontSize: '11px', color: '#94a3b8', margin: '6px 0 0' }}>✓ ใส่โค้ดแล้ว ไม่สามารถแก้ไขได้</p>}
          </div>

          <button onClick={handleSave} style={S.saveBtn}>{tx.saveBtn}</button>

          <div style={{ marginTop: '12px', position: 'relative' }}>
            <button onClick={() => setShowLangPicker(v => !v)} style={S.langBtn}>
              {selectedLang?.label || '🌐'} ▾
            </button>
            {showLangPicker && (
              <div style={S.langPicker}>
                {LANGUAGES.map(lang => (
                  <button key={lang.code}
                    onClick={() => { setPreferredLang(lang.code); setShowLangPicker(false); }}
                    style={{ ...S.langOption, background: preferredLang === lang.code ? '#ede9fe' : 'transparent', color: preferredLang === lang.code ? '#6366f1' : '#374151', fontWeight: preferredLang === lang.code ? 'bold' : 'normal' }}>
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }} style={S.logoutBtn}>
            {tx.logoutBtn}
          </button>

        </div>
      </div>
    </div>
  );
}

const SectionTitle = ({children}) => <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#6366f1', marginTop: '25px', marginBottom: '15px', textTransform: 'uppercase' }}>{children}</h3>;
const Field = ({label, children}) => <div style={{ marginBottom: '15px' }}><label style={S.label}>{label}</label>{children}</div>;

const S = {
  label:     { display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: '#475569' },
  input:     { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#000', fontSize: '15px', outline: 'none', boxSizing: 'border-box' },
  delBtn:    { position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: '10px' },
  uploadBox: { aspectRatio: '1/1', border: '2px dashed #cbd5e1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '24px', color: '#94a3b8', background: '#f8fafc' },
  saveBtn:   { width: '100%', padding: '18px', borderRadius: '30px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', fontWeight: 'bold', fontSize: '17px', marginTop: '30px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' },
  langBtn:   { width: '100%', padding: '13px', borderRadius: '30px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#6366f1', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  logoutBtn: { width: '100%', padding: '13px', borderRadius: '30px', border: '1.5px solid #e2e8f0', background: 'transparent', color: '#94a3b8', fontWeight: 'bold', fontSize: '14px', marginTop: '10px', cursor: 'pointer' },
  langPicker:{ position: 'absolute', bottom: '110%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 -8px 30px rgba(0,0,0,0.12)', zIndex: 100, maxHeight: '280px', overflowY: 'auto', padding: '8px' },
  langOption:{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', textAlign: 'left' },
};