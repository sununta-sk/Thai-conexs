// src/lib/I18.js
// ── Central translation system for Thai Conexns ──
// ── ใช้ทุกหน้า: User + Admin ──

export const SUPPORTED_LANGS = [
  { code: 'th', label: 'TH' },
  { code: 'en', label: 'EN' },
];

const T = {
  // ─────────────────────────────────────────────
  // COMMON — ใช้ทุกหน้า
  // ─────────────────────────────────────────────
  common: {
    th: { save:'บันทึก', cancel:'ยกเลิก', confirm:'ยืนยัน', back:'ย้อนกลับ', loading:'กำลังโหลด...', error:'เกิดข้อผิดพลาด', success:'สำเร็จ', submit:'ส่ง', search:'ค้นหา', close:'ปิด', delete:'ลบ', edit:'แก้ไข', view:'ดู', logout:'ออกจากระบบ', online:'ออนไลน์', offline:'ออฟไลน์', yes:'ใช่', no:'ไม่', send:'ส่ง', sending:'กำลังส่ง...', retry:'ลองใหม่', },
    en: { save:'Save', cancel:'Cancel', confirm:'Confirm', back:'Back', loading:'Loading...', error:'Error', success:'Success', submit:'Submit', search:'Search', close:'Close', delete:'Delete', edit:'Edit', view:'View', logout:'Logout', online:'Online', offline:'Offline', yes:'Yes', no:'No', send:'Send', sending:'Sending...', retry:'Retry', },
  },

  // ─────────────────────────────────────────────
  // DISCOVER PAGE
  // ─────────────────────────────────────────────
  discover: {
    th: { title:'ค้นพบ', noUsers:'ไม่มีผู้ใช้ออนไลน์', onlineUsers:'ผู้ใช้ออนไลน์', sendMessage:'ส่งข้อความ', viewProfile:'ดูโปรไฟล์', filters:'ตัวกรอง', },
    en: { title:'Discover', noUsers:'No users online', onlineUsers:'Online Users', sendMessage:'Send Message', viewProfile:'View Profile', filters:'Filters', },
  },

  // ─────────────────────────────────────────────
  // MESSAGES PAGE
  // ─────────────────────────────────────────────
  messages: {
    th: { title:'ข้อความ', noConversations:'ยังไม่มีการสนทนา', typeMessage:'พิมพ์ข้อความ...', you:'คุณ', },
    en: { title:'Messages', noConversations:'No conversations yet', typeMessage:'Type a message...', you:'You', },
  },

  // ─────────────────────────────────────────────
  // ROOM CHAT
  // ─────────────────────────────────────────────
  chat: {
    th: { translating:'กำลังแปลข้อความ...', originalMsg:'ต้นฉบับ', autoTranslated:'แปลอัตโนมัติ', notVerified:'ยังไม่ได้ยืนยันตัวตน', notVerifiedSub:'ยืนยันตัวตนก่อนถึงจะส่งข้อความได้', verifyNow:'ยืนยันตัวตน', placeholder:'พิมพ์ข้อความ...', faceInCircle:'วางใบหน้าให้อยู่ในวงกลม', ticketTitle:'ส่ง Support Ticket', ticketSub:'แจ้งปัญหาเกี่ยวกับ', ticketPlaceholder:'อธิบายปัญหาที่พบ...', ticketSent:'ส่ง Ticket แล้ว!', ticketSentSub:'Admin จะติดต่อกลับเร็วๆ นี้', reportTitle:'Report User', reportSent:'Report ส่งแล้ว!', reportSentSub:'ทีมงานจะตรวจสอบโดยเร็ว', reportReasons:['พฤติกรรมไม่เหมาะสม','ข้อความ harassment','โปรไฟล์ปลอม / scam','เนื้อหาไม่เหมาะสม','อื่นๆ'], },
    en: { translating:'Translating messages...', originalMsg:'Original', autoTranslated:'Auto-translated', notVerified:'Identity Not Verified', notVerifiedSub:'Verify your identity to send messages', verifyNow:'Verify Now', placeholder:'Type your message...', faceInCircle:'Place your face in the circle', ticketTitle:'Send Support Ticket', ticketSub:'Report an issue with', ticketPlaceholder:'Describe the issue...', ticketSent:'Ticket Submitted!', ticketSentSub:'Admin will follow up shortly', reportTitle:'Report User', reportSent:'Report Submitted!', reportSentSub:'Our team will review shortly', reportReasons:['Inappropriate behavior','Harassment','Fake profile / scam','Inappropriate content','Other'], },
  },

  // ─────────────────────────────────────────────
  // AUTH — Login / Register
  // ─────────────────────────────────────────────
  auth: {
    th: { login:'เข้าสู่ระบบ', register:'สมัครสมาชิก', email:'อีเมล', password:'รหัสผ่าน', forgotPassword:'ลืมรหัสผ่าน?', noAccount:'ยังไม่มีบัญชี?', hasAccount:'มีบัญชีแล้ว?', continueGoogle:'ดำเนินการด้วย Google', },
    en: { login:'Log In', register:'Sign Up', email:'Email', password:'Password', forgotPassword:'Forgot password?', noAccount:"Don't have an account?", hasAccount:'Already have an account?', continueGoogle:'Continue with Google', },
  },

  // ─────────────────────────────────────────────
  // PAYOUT (User)
  // ─────────────────────────────────────────────
  payout: {
    th: { title:'ขอถอนเงิน', availableBalance:'ยอดคงเหลือ', requestPayout:'ยืนยัน Request Payout', minAmount:'ยอดขั้นต่ำ', belowMin:'ยอดไม่ถึงขั้นต่ำ', belowMinSub:'ต้องมีอย่างน้อย €{min} ถึงจะ request ได้', paymentMethod:'ช่องทางรับเงิน', paymentDetail:'ข้อมูลการรับเงิน', note:'หมายเหตุ (ไม่บังคับ)', history:'ประวัติการถอนเงิน', submitted:'ส่ง Request แล้ว!', submittedSub:'Admin จะตรวจสอบและโอนเงินให้ภายใน 1-3 วันทำการ', processing:'1-3 วันทำการ', },
    en: { title:'Request Payout', availableBalance:'Available Balance', requestPayout:'Confirm Payout Request', minAmount:'Minimum Amount', belowMin:'Below Minimum', belowMinSub:'Need at least €{min} to request', paymentMethod:'Payment Method', paymentDetail:'Payment Details', note:'Note (optional)', history:'Payout History', submitted:'Request Submitted!', submittedSub:'Admin will transfer within 1-3 business days', processing:'1-3 business days', },
  },

  // ─────────────────────────────────────────────
  // USER PROFILE PAGE — /profile/:userId
  // ─────────────────────────────────────────────
  userProfile: {
    th: { back:'← กลับ', sendMessage:'💬 ส่งข้อความ', aboutMe:'เกี่ยวกับฉัน', generalInfo:'ข้อมูลทั่วไป', online:'ออนไลน์อยู่', justNow:'เพิ่งออนไลน์', minAgo:(n)=>`${n} นาทีที่แล้ว`, hrAgo:(n)=>`${n} ชั่วโมงที่แล้ว`, dayAgo:(n)=>`${n} วันที่แล้ว`, notFound:'ไม่พบโปรไฟล์นี้', verified:'✓ ยืนยันแล้ว', },
    en: { back:'← Back', sendMessage:'💬 Send Message', aboutMe:'About Me', generalInfo:'General Info', online:'Online', justNow:'Just now', minAgo:(n)=>`${n}m ago`, hrAgo:(n)=>`${n}h ago`, dayAgo:(n)=>`${n}d ago`, notFound:'Profile not found', verified:'✓ Verified', },
  },
};

export function getT(page, lang = 'en') {
  const pageTrans = T[page];
  if (!pageTrans) return {};
  return pageTrans[lang] || pageTrans['en'] || {};
}

export function getTMany(pages, lang = 'en') {
  const result = { ...getT('common', lang) };
  for (const page of pages) {
    Object.assign(result, getT(page, lang));
  }
  return result;
}

export default T;