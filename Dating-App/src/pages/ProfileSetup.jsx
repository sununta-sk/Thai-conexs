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
  zh: {
    profilePhotos:'Profile Photos (max 10)', faceVerify:'身份验证',
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
    sidebarAbout:'关于我', sidebarInfo:'个人信息', sidebarLifestyle:'生活方式',
  },
  ja: {
    profilePhotos:'Profile Photos (max 10)', faceVerify:'本人確認（顔認証）',
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
    sidebarAbout:'私について', sidebarInfo:'個人情報', sidebarLifestyle:'ライフスタイル',
  },
  ko: {
    profilePhotos:'Profile Photos (max 10)', faceVerify:'본인 인증',
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
    sidebarAbout:'나에 대해', sidebarInfo:'개인 정보', sidebarLifestyle:'라이프스타일',
  },
  fr: {
    profilePhotos:'Profile Photos (max 10)', faceVerify:"Vérification d'identité",
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
    sidebarAbout:'À propos', sidebarInfo:'Infos perso', sidebarLifestyle:'Style de vie',
  },
  de: {
    profilePhotos:'Profile Photos (max 10)', faceVerify:'Identitätsverifizierung',
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
    sidebarAbout:'Über mich', sidebarInfo:'Persönliche Daten', sidebarLifestyle:'Lebensstil',
  },
  es: {
    profilePhotos:'Profile Photos (max 10)', faceVerify:'Verificación de identidad',
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
    sidebarAbout:'Sobre mí', sidebarInfo:'Info personal', sidebarLifestyle:'Estilo de vida',
  },
  it: {
    profilePhotos:'Profile Photos (max 10)', faceVerify:'Verifica identità',
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
    sidebarAbout:'Su di me', sidebarInfo:'Info personali', sidebarLifestyle:'Stile di vita',
  },
  pt: {
    profilePhotos:'Profile Photos (max 10)', faceVerify:'Verificação de identidade',
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
    sidebarAbout:'Sobre mim', sidebarInfo:'Info pessoal', sidebarLifestyle:'Estilo de vida',
  },
  ru: {
    profilePhotos:'Profile Photos (max 10)', faceVerify:'Верификация личности',
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
    sidebarAbout:'Обо мне', sidebarInfo:'Личные данные', sidebarLifestyle:'Образ жизни',
  },
  ar: {
    profilePhotos:'Profile Photos (max 10)', faceVerify:'التحقق من الهوية',
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
    sidebarAbout:'عني', sidebarInfo:'معلومات شخصية', sidebarLifestyle:'نمط الحياة',
  },
  hi: {
    profilePhotos:'Profile Photos (max 10)', faceVerify:'पहचान सत्यापन',
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
    sidebarAbout:'मेरे बारे में', sidebarInfo:'व्यक्तिगत जानकारी', sidebarLifestyle:'जीवन शैली',
  },
  vi: {
    profilePhotos:'Profile Photos (max 10)', faceVerify:'Xác minh danh tính',
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
    sidebarAbout:'Về tôi', sidebarInfo:'Thông tin cá nhân', sidebarLifestyle:'Phong cách sống',
  },
  id: {
    profilePhotos:'Profile Photos (max 10)', faceVerify:'Verifikasi Identitas',
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
    sidebarAbout:'Tentang Saya', sidebarInfo:'Info Pribadi', sidebarLifestyle:'Gaya Hidup',
  },
  ms: {
    profilePhotos:'Profile Photos (max 10)', faceVerify:'Pengesahan Identiti',
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
    sidebarAbout:'Tentang Saya', sidebarInfo:'Maklumat Peribadi', sidebarLifestyle:'Gaya Hidup',
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
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, username, bio, avatar_url: mainPhoto,
      photos, details, referral_code: myReferralCode,
      lifestyle,
      preferred_lang: preferredLang, updated_at: new Date(),
      referred_by: friendCode.trim().toUpperCase() || null,
    }, { onConflict: 'id' });
    if (!error) {
      alert('✅ ' + tx.saveBtn);
      navigate('/discover');
    } else {
      alert('Error: ' + error.message);
    }
  };

  const selectedLang = LANGUAGES.find(l => l.code === preferredLang);
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

      {/* Identity Verification */}
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

      <div style={{ marginTop: '12px', position: 'relative' }}>
        <button onClick={() => setShowLangPicker(v => !v)} style={S.langBtn}>
          {selectedLang?.label || '🌐'} ▾
        </button>
        {showLangPicker && (
          <div style={S.langPicker}>
            {LANGUAGES.map(lang => (
              <button key={lang.code}
                onClick={() => { setPreferredLang(lang.code); setShowLangPicker(false); }}
                style={{ ...S.langOption, background: preferredLang === lang.code ? 'rgba(233, 30, 99, 0.15)' : 'transparent', color: preferredLang === lang.code ? '#e91e63' : '#cbd5e1', fontWeight: preferredLang === lang.code ? 'bold' : 'normal' }}>
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