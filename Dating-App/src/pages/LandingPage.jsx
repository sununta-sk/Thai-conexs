import { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from '../hooks/useTranslation';
import logoFull from '../lib/LotusConnexs-full.jpeg';
import imgConversation from '../lib/conversation.jpeg';
import imgSongkran from '../lib/songkran.jpeg';
import imgThaifood from '../lib/thaifood.jpeg';

// ============================================================
// PRICING — UPDATE THESE WITH REAL PRICES
// ============================================================
const PRICING = {
  gold: { monthly: '฿299', label: 'GOLD' },
  platinum: { monthly: '฿599', label: 'PLATINUM' },
};

const CONTENT = {
  en: {
    brand: 'Lotus ConneXs',
    nav: { features: 'Features', how: 'How It Works', pricing: 'Pricing', faq: 'FAQ', login: 'Log In', signup: 'Sign Up' },
    hero: {
      h1: 'Meet Thai Singles for Real Connections',
      sub: 'A modern dating platform connecting people from around the world with Thai singles who are genuinely interested in friendship, romance, and real connections.',
      ctaPrimary: 'Join Now — It\'s Free',
      ctaSecondary: 'Log In',
      trust: ['Free to join', 'Verified profiles', 'Active community', 'Safe & moderated'],
    },
    stats: {
      heading: 'Why People Choose Lotus ConneXs',
      items: [
        { label: 'Growing Community', value: 'Thai-First' },
        { label: 'Active Moderation', value: '24/7' },
        { label: 'Coverage', value: 'All Provinces' },
        { label: 'Languages', value: 'EN + TH' },
      ],
    },
    features: {
      heading: 'Built for Genuine Connections',
      sub: 'Everything you need to meet, chat, and connect — safely.',
      items: [
        { icon: '\u2713', title: 'Face Verification', desc: 'Real people, real photos. Our verification system ensures the person you\'re chatting with is who they say they are.' },
        { icon: '\u2728', title: 'Auto-Translation', desc: 'Chat naturally in your language. Messages translate automatically between Thai and English in real time.' },
        { icon: '\u2691', title: 'Photo Moderation', desc: 'Every profile photo is reviewed. Fake, stolen, and inappropriate images are removed promptly.' },
        { icon: '\u26A1', title: 'Real-Time Chat', desc: 'Send messages, GIFs, voice notes, and photos. No waiting for matches — start a conversation instantly.' },
        { icon: '\u2605', title: 'Smart Discovery', desc: 'Browse by city, age, and interests. Find people near you or across all of Thailand.' },
        { icon: '\u2665', title: 'Safety First', desc: 'Report and block tools, strict community rules, and a dedicated moderation team keep the community respectful.' },
      ],
    },
    how: {
      heading: 'Get Started in 3 Simple Steps',
      steps: [
        { num: '1', title: 'Sign Up Free', desc: 'Create your account in under a minute. Email or phone — no credit card needed.' },
        { num: '2', title: 'Verify & Set Up', desc: 'Add photos, complete your bio, and verify your identity to unlock the full community.' },
        { num: '3', title: 'Start Connecting', desc: 'Browse profiles, send messages, and meet Thai singles looking for real connections.' },
      ],
    },
    showcase: {
      heading: 'Designed for the Way You Meet',
      sub: 'A clean, mobile-first experience that puts real people first.',
      cards: [
        { title: 'Discover', desc: 'Browse profiles tailored to your preferences', img: imgConversation },
        { title: 'Connect', desc: 'Send messages, GIFs, and voice notes instantly', img: imgSongkran },
        { title: 'Meet', desc: 'Take the conversation from chat to real life', img: imgThaifood },
      ],
    },
    whyUs: {
      heading: 'What Makes Us Different',
      items: [
        { title: 'Not Another Swipe App', desc: 'No artificial matching gates. Start a conversation with anyone, anytime — the way real connections begin.' },
        { title: 'Built for Thailand', desc: 'Full Thai language support, local payment methods, and a community that understands Thai culture and dating norms.' },
        { title: 'Real People, Real Verification', desc: 'Face verification and photo moderation create a community of authentic profiles — not bots, not catfish.' },
      ],
    },
    pricing: {
      heading: 'Simple, Transparent Pricing',
      sub: 'Start free. Upgrade anytime to boost your visibility.',
      tiers: [
        {
          name: 'FREE',
          price: '฿0',
          period: 'forever',
          highlight: false,
          features: ['Browse all profiles', 'Send unlimited messages', 'Photo & profile verification', 'Block & report tools', 'Basic visibility'],
          cta: 'Get Started',
        },
        {
          name: PRICING.gold.label,
          price: PRICING.gold.monthly,
          period: 'per month',
          highlight: true,
          features: ['Everything in Free', 'Boosted profile visibility', 'See who liked you', 'Priority chat support', 'Advanced search filters', 'Ad-free experience'],
          cta: 'Upgrade to Gold',
        },
        {
          name: PRICING.platinum.label,
          price: PRICING.platinum.monthly,
          period: 'per month',
          highlight: false,
          features: ['Everything in Gold', 'Top placement in Discover', 'Read receipts', 'Profile insights', 'Premium support', 'Early access to new features'],
          cta: 'Go Platinum',
        },
      ],
    },
    faq: {
      heading: 'Frequently Asked Questions',
      items: [
        { q: 'Is Lotus ConneXs really free?', a: 'Yes. You can browse profiles, send messages, and use the core platform for free, forever. Gold and Platinum subscriptions unlock added visibility and features but are completely optional.' },
        { q: 'How are profiles verified?', a: 'We use face verification combined with photo moderation. Profile photos are reviewed by our team, and members can be asked to verify their identity at any time. Fake profiles are removed.' },
        { q: 'Can I use Lotus ConneXs in Thai?', a: 'Absolutely. The entire platform supports both English and Thai. You can switch languages at any time. Messages between members can also be auto-translated.' },
        { q: 'How do I report someone who breaks the rules?', a: 'Every profile and message has a report button. Reports are reviewed within 24 to 48 hours. Severe violations result in immediate permanent bans.' },
        { q: 'Can I cancel my subscription?', a: 'Yes. Cancel anytime from your account settings. Your subscription remains active until the end of the billing period.' },
        { q: 'Is my personal information safe?', a: 'We take privacy seriously. Your contact details are never shared with other members. You control what appears on your profile.' },
        { q: 'Who can I contact for help?', a: 'Reach our support team anytime at support@thai-conexns.com. We respond within 24 hours.' },
      ],
    },
    finalCta: {
      heading: 'Ready to Meet Someone Special?',
      sub: 'Join a growing community of Thai singles and start your story today.',
      button: 'Sign Up Free',
      note: 'No credit card required',
    },
    footer: {
      tagline: 'Connecting hearts, the Thai way.',
      product: 'Product',
      company: 'Company',
      legal: 'Legal',
      links: {
        features: 'Features', pricing: 'Pricing', faq: 'FAQ',
        about: 'About', contact: 'Contact',
        rules: 'Community Rules', privacy: 'Privacy', terms: 'Terms',
      },
      copyright: '\u00A9 2026 Lotus ConneXs. All rights reserved.',
    },
  },
  th: {
    brand: 'Lotus ConneXs',
    nav: { features: 'ฟีเจอร์', how: 'วิธีใช้งาน', pricing: 'แพ็คเกจ', faq: 'คำถาม', login: 'เข้าสู่ระบบ', signup: 'สมัครฟรี' },
    hero: {
      h1: 'พบคนไทยเพื่อความสัมพันธ์ที่แท้จริง',
      sub: 'แพลตฟอร์มหาคู่สมัยใหม่ที่เชื่อมต่อผู้คนจากทั่วโลกกับคนไทย เพื่อมิตรภาพ ความรัก และความสัมพันธ์ที่จริงใจ',
      ctaPrimary: 'สมัครเลย — ฟรี!',
      ctaSecondary: 'เข้าสู่ระบบ',
      trust: ['สมัครฟรี', 'โปรไฟล์ยืนยันตัวตน', 'ชุมชนที่ active', 'ปลอดภัย ดูแลตลอด'],
    },
    stats: {
      heading: 'ทำไมต้อง Lotus ConneXs',
      items: [
        { label: 'ชุมชนของคนไทย', value: 'ออกแบบเพื่อคนไทย' },
        { label: 'การดูแล', value: '24 ชม.' },
        { label: 'พื้นที่ให้บริการ', value: 'ทั่วประเทศ' },
        { label: 'ภาษา', value: 'EN + TH' },
      ],
    },
    features: {
      heading: 'สร้างมาเพื่อความสัมพันธ์ที่แท้จริง',
      sub: 'ทุกอย่างที่คุณต้องการ — พบ คุย เชื่อมต่อ อย่างปลอดภัย',
      items: [
        { icon: '\u2713', title: 'ยืนยันใบหน้า', desc: 'คนจริง รูปจริง ระบบยืนยันใบหน้าช่วยให้แน่ใจว่าคู่สนทนาเป็นคนจริง ไม่ใช่ปลอม' },
        { icon: '\u2728', title: 'แปลภาษาอัตโนมัติ', desc: 'แชทเป็นภาษาของคุณ ระบบแปลภาษาระหว่างไทยกับอังกฤษให้อัตโนมัติแบบเรียลไทม์' },
        { icon: '\u2691', title: 'ตรวจสอบรูปภาพ', desc: 'รูปโปรไฟล์ทุกใบผ่านการตรวจสอบ รูปปลอม รูปขโมย หรือไม่เหมาะสมจะถูกลบทันที' },
        { icon: '\u26A1', title: 'แชทเรียลไทม์', desc: 'ส่งข้อความ GIF เสียง รูป — ไม่ต้องรอจับคู่ เริ่มคุยได้ทันที' },
        { icon: '\u2605', title: 'ค้นหาแบบสมาร์ท', desc: 'ค้นหาตามเมือง อายุ ความสนใจ ทั้งคนใกล้บ้านหรือทั่วประเทศไทย' },
        { icon: '\u2665', title: 'ความปลอดภัยมาก่อน', desc: 'มีปุ่ม report และ block กฎชุมชนเข้มงวด ทีม moderation ดูแลให้ชุมชนปลอดภัย' },
      ],
    },
    how: {
      heading: 'เริ่มต้น 3 ขั้นตอนง่ายๆ',
      steps: [
        { num: '1', title: 'สมัครฟรี', desc: 'สร้างบัญชีในไม่ถึง 1 นาที — อีเมลหรือเบอร์มือถือ ไม่ต้องใช้บัตรเครดิต' },
        { num: '2', title: 'ยืนยันตัวตน', desc: 'เพิ่มรูป กรอกประวัติ ยืนยันใบหน้าเพื่อปลดล็อกชุมชนทั้งหมด' },
        { num: '3', title: 'เริ่มเชื่อมต่อ', desc: 'ค้นหาโปรไฟล์ ส่งข้อความ พบคนไทยที่กำลังมองหาความสัมพันธ์ที่แท้จริง' },
      ],
    },
    showcase: {
      heading: 'ออกแบบเพื่อการพบกันที่เป็นธรรมชาติ',
      sub: 'ประสบการณ์ที่สะอาด ใช้ง่ายบนมือถือ เน้นคนจริงๆ',
      cards: [
        { title: 'ค้นพบ', desc: 'ค้นหาโปรไฟล์ที่ตรงกับความต้องการของคุณ', img: imgConversation },
        { title: 'เชื่อมต่อ', desc: 'ส่งข้อความ GIF เสียง ได้ทันที', img: imgSongkran },
        { title: 'พบกัน', desc: 'จากการแชทสู่การพบเจอกันจริง', img: imgThaifood },
      ],
    },
    whyUs: {
      heading: 'อะไรทำให้เราแตกต่าง',
      items: [
        { title: 'ไม่ใช่แค่แอป Swipe', desc: 'ไม่ต้องรอจับคู่ คุยกับใครก็ได้ทันที — แบบที่ความสัมพันธ์จริงๆ เริ่มต้น' },
        { title: 'ออกแบบเพื่อประเทศไทย', desc: 'รองรับภาษาไทยเต็มรูปแบบ ช่องทางชำระเงินในไทย ชุมชนที่เข้าใจวัฒนธรรมไทย' },
        { title: 'คนจริง ยืนยันจริง', desc: 'ระบบยืนยันใบหน้าและตรวจรูปสร้างชุมชนคนจริงๆ ไม่ใช่บอท ไม่ใช่ catfish' },
      ],
    },
    pricing: {
      heading: 'ราคาเข้าใจง่าย โปร่งใส',
      sub: 'เริ่มฟรี อัปเกรดเมื่อพร้อมเพื่อเพิ่มการมองเห็น',
      tiers: [
        {
          name: 'FREE',
          price: '฿0',
          period: 'ตลอดไป',
          highlight: false,
          features: ['ดูโปรไฟล์ทุกคน', 'ส่งข้อความไม่จำกัด', 'ยืนยันรูปและโปรไฟล์', 'ปุ่ม block และ report', 'การมองเห็นพื้นฐาน'],
          cta: 'เริ่มเลย',
        },
        {
          name: PRICING.gold.label,
          price: PRICING.gold.monthly,
          period: 'ต่อเดือน',
          highlight: true,
          features: ['ทุกอย่างที่มีใน Free', 'เพิ่มการมองเห็นโปรไฟล์', 'เห็นคนที่กดถูกใจคุณ', 'support ลำดับต้นๆ', 'ตัวกรองค้นหาขั้นสูง', 'ไม่มีโฆษณา'],
          cta: 'อัปเกรด Gold',
        },
        {
          name: PRICING.platinum.label,
          price: PRICING.platinum.monthly,
          period: 'ต่อเดือน',
          highlight: false,
          features: ['ทุกอย่างที่มีใน Gold', 'ขึ้นต้นในหน้า Discover', 'รู้ว่าใครอ่านแล้ว', 'สถิติโปรไฟล์', 'support พรีเมียม', 'เข้าถึงฟีเจอร์ใหม่ก่อน'],
          cta: 'อัปเกรด Platinum',
        },
      ],
    },
    faq: {
      heading: 'คำถามที่พบบ่อย',
      items: [
        { q: 'Lotus ConneXs ฟรีจริงไหม', a: 'จริง — ดูโปรไฟล์ ส่งข้อความ และใช้งานหลักทั้งหมดได้ฟรี ตลอดไป Gold และ Platinum เป็นทางเลือกเพิ่มเติมเท่านั้น' },
        { q: 'ยืนยันโปรไฟล์ยังไง', a: 'เราใช้การยืนยันใบหน้าร่วมกับการตรวจสอบรูป ทีมงานตรวจรูปโปรไฟล์ทุกใบ สมาชิกอาจถูกขอให้ยืนยันตัวตนได้ตลอดเวลา โปรไฟล์ปลอมจะถูกลบ' },
        { q: 'ใช้ภาษาไทยได้ไหม', a: 'ได้ — ทั้งแพลตฟอร์มรองรับทั้งไทยและอังกฤษ สลับภาษาได้ตลอด ข้อความระหว่างสมาชิกแปลอัตโนมัติได้ด้วย' },
        { q: 'ถ้าเจอคนทำผิดกฎต้องทำยังไง', a: 'ทุกโปรไฟล์และข้อความมีปุ่ม report รายงานจะถูกตรวจสอบใน 24-48 ชั่วโมง การละเมิดรุนแรงโดนแบนถาวรทันที' },
        { q: 'ยกเลิกการสมัครได้ไหม', a: 'ได้ ยกเลิกได้ตลอดในหน้าตั้งค่าบัญชี การสมัครจะใช้งานได้จนถึงวันสุดท้ายของรอบบิล' },
        { q: 'ข้อมูลส่วนตัวปลอดภัยไหม', a: 'เราให้ความสำคัญกับความเป็นส่วนตัว — ข้อมูลติดต่อไม่ถูกแชร์กับสมาชิกอื่น คุณควบคุมได้ว่าจะให้ข้อมูลไหนแสดงในโปรไฟล์' },
        { q: 'ติดต่อช่วยเหลือที่ไหน', a: 'ติดต่อทีม support ได้ที่ support@thai-conexns.com ตอบกลับภายใน 24 ชั่วโมง' },
      ],
    },
    finalCta: {
      heading: 'พร้อมพบใครพิเศษหรือยัง',
      sub: 'มาร่วมชุมชนคนไทยที่กำลังเติบโต เริ่มเรื่องราวของคุณวันนี้',
      button: 'สมัครฟรี',
      note: 'ไม่ต้องใช้บัตรเครดิต',
    },
    footer: {
      tagline: 'เชื่อมต่อหัวใจ ในแบบไทยๆ',
      product: 'ผลิตภัณฑ์',
      company: 'บริษัท',
      legal: 'กฎหมาย',
      links: {
        features: 'ฟีเจอร์', pricing: 'แพ็คเกจ', faq: 'คำถาม',
        about: 'เกี่ยวกับเรา', contact: 'ติดต่อ',
        rules: 'กฎชุมชน', privacy: 'ความเป็นส่วนตัว', terms: 'เงื่อนไข',
      },
      copyright: '\u00A9 2026 Lotus ConneXs สงวนลิขสิทธิ์',
    },
  },
};

export default function LandingPage() {
  const { lang, setLang } = useTranslation(['common']);
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const c = CONTENT[lang === 'th' ? 'th' : 'en'];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Logged-in users go straight to Discover
  if (session) return <Navigate to="/discover" replace />;
  if (session === undefined) return null;

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={S.page}>
      {/* ===== NAVBAR ===== */}
      <header style={{ ...S.navbar, ...(scrolled ? S.navbarScrolled : {}) }}>
        <div style={S.navInner}>
          <div style={S.navLeft}>
            <img src={logoFull} alt="Lotus ConneXs" style={S.navLogo} />
            <span style={S.navBrand}>{c.brand}</span>
          </div>
          <nav style={S.navLinks}>
            <button style={S.navLink} onClick={() => scrollTo('features')}>{c.nav.features}</button>
            <button style={S.navLink} onClick={() => scrollTo('how')}>{c.nav.how}</button>
            <button style={S.navLink} onClick={() => scrollTo('pricing')}>{c.nav.pricing}</button>
            <button style={S.navLink} onClick={() => scrollTo('faq')}>{c.nav.faq}</button>
          </nav>
          <div style={S.navRight}>
            <div style={S.langToggle}>
              <button
                style={{ ...S.langBtn, ...(lang === 'en' ? S.langBtnActive : {}) }}
                onClick={() => setLang('en')}
              >EN</button>
              <button
                style={{ ...S.langBtn, ...(lang === 'th' ? S.langBtnActive : {}) }}
                onClick={() => setLang('th')}
              >TH</button>
            </div>
            <Link to="/login" style={S.navLogin}>{c.nav.login}</Link>
            <Link to="/register" style={S.navSignup}>{c.nav.signup}</Link>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section style={S.hero}>
        <div style={S.heroInner}>
          <div style={S.heroLeft}>
            <h1 style={S.heroH1}>{c.hero.h1}</h1>
            <p style={S.heroSub}>{c.hero.sub}</p>
            <div style={S.heroCtas}>
              <Link to="/register" style={S.btnPrimary}>{c.hero.ctaPrimary}</Link>
              <Link to="/login" style={S.btnSecondary}>{c.hero.ctaSecondary}</Link>
            </div>
            <div style={S.trustRow}>
              {c.hero.trust.map((t, i) => (
                <div key={i} style={S.trustItem}>
                  <span style={S.trustCheck}>{'\u2713'}</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={S.heroRight}>
            <div style={S.phoneFrame}>
              <img src={imgConversation} alt="App preview" style={S.phoneImg} />
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section style={S.stats}>
        <div style={S.statsInner}>
          <h2 style={S.sectionH2}>{c.stats.heading}</h2>
          <div style={S.statsGrid}>
            {c.stats.items.map((s, i) => (
              <div key={i} style={S.statCard}>
                <div style={S.statValue}>{s.value}</div>
                <div style={S.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" style={S.features}>
        <div style={S.sectionInner}>
          <h2 style={S.sectionH2}>{c.features.heading}</h2>
          <p style={S.sectionSub}>{c.features.sub}</p>
          <div style={S.featuresGrid}>
            {c.features.items.map((f, i) => (
              <div key={i} style={S.featureCard}>
                <div style={S.featureIcon}>{f.icon}</div>
                <h3 style={S.featureTitle}>{f.title}</h3>
                <p style={S.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how" style={S.how}>
        <div style={S.sectionInner}>
          <h2 style={S.sectionH2}>{c.how.heading}</h2>
          <div style={S.howGrid}>
            {c.how.steps.map((step, i) => (
              <div key={i} style={S.howStep}>
                <div style={S.howNum}>{step.num}</div>
                <h3 style={S.howTitle}>{step.title}</h3>
                <p style={S.howDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SHOWCASE ===== */}
      <section style={S.showcase}>
        <div style={S.sectionInner}>
          <h2 style={S.sectionH2}>{c.showcase.heading}</h2>
          <p style={S.sectionSub}>{c.showcase.sub}</p>
          <div style={S.showcaseGrid}>
            {c.showcase.cards.map((card, i) => (
              <div key={i} style={S.showcaseCard}>
                <div style={S.phoneFrameSmall}>
                  <img src={card.img} alt={card.title} style={S.phoneImg} />
                </div>
                <h3 style={S.showcaseTitle}>{card.title}</h3>
                <p style={S.showcaseDesc}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== WHY US ===== */}
      <section style={S.whyUs}>
        <div style={S.sectionInner}>
          <h2 style={S.sectionH2}>{c.whyUs.heading}</h2>
          <div style={S.whyGrid}>
            {c.whyUs.items.map((item, i) => (
              <div key={i} style={S.whyCard}>
                <h3 style={S.whyTitle}>{item.title}</h3>
                <p style={S.whyDesc}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" style={S.pricing}>
        <div style={S.sectionInner}>
          <h2 style={S.sectionH2}>{c.pricing.heading}</h2>
          <p style={S.sectionSub}>{c.pricing.sub}</p>
          <div style={S.pricingGrid}>
            {c.pricing.tiers.map((tier, i) => (
              <div
                key={i}
                style={{ ...S.pricingCard, ...(tier.highlight ? S.pricingCardHighlight : {}) }}
              >
                {tier.highlight && <div style={S.pricingBadge}>POPULAR</div>}
                <div style={S.pricingName}>{tier.name}</div>
                <div style={S.pricingPriceRow}>
                  <span style={S.pricingPrice}>{tier.price}</span>
                  <span style={S.pricingPeriod}>/ {tier.period}</span>
                </div>
                <ul style={S.pricingList}>
                  {tier.features.map((f, j) => (
                    <li key={j} style={S.pricingItem}>
                      <span style={S.pricingCheck}>{'\u2713'}</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  style={tier.highlight ? S.btnPrimary : S.btnOutline}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" style={S.faq}>
        <div style={S.faqInner}>
          <h2 style={S.sectionH2}>{c.faq.heading}</h2>
          <div style={S.faqList}>
            {c.faq.items.map((item, i) => (
              <div key={i} style={S.faqItem}>
                <button
                  style={S.faqQuestion}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span style={{ flex: 1, textAlign: 'left' }}>{item.q}</span>
                  <span style={{
                    transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                    fontSize: 14,
                    color: '#e91e63',
                  }}>{'\u25BC'}</span>
                </button>
                {openFaq === i && (
                  <div style={S.faqAnswer}>{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section style={S.finalCta}>
        <div style={S.finalCtaInner}>
          <h2 style={S.finalH2}>{c.finalCta.heading}</h2>
          <p style={S.finalSub}>{c.finalCta.sub}</p>
          <Link to="/register" style={S.btnPrimaryLarge}>{c.finalCta.button}</Link>
          <p style={S.finalNote}>{c.finalCta.note}</p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={S.footer}>
        <div style={S.footerInner}>
          <div style={S.footerTop}>
            <div style={S.footerBrand}>
              <img src={logoFull} alt="Lotus ConneXs" style={S.footerLogo} />
              <p style={S.footerTagline}>{c.footer.tagline}</p>
            </div>
            <div style={S.footerCols}>
              <div style={S.footerCol}>
                <h4 style={S.footerColTitle}>{c.footer.product}</h4>
                <button style={S.footerLink} onClick={() => scrollTo('features')}>{c.footer.links.features}</button>
                <button style={S.footerLink} onClick={() => scrollTo('pricing')}>{c.footer.links.pricing}</button>
                <button style={S.footerLink} onClick={() => scrollTo('faq')}>{c.footer.links.faq}</button>
              </div>
              <div style={S.footerCol}>
                <h4 style={S.footerColTitle}>{c.footer.legal}</h4>
                <Link to="/rules" style={S.footerLink}>{c.footer.links.rules}</Link>
              </div>
            </div>
          </div>
          <div style={S.footerBottom}>
            <span>{c.footer.copyright}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const PINK = '#e91e63';
const PINK_DARK = '#c2185b';
const PINK_LIGHT = '#fce4ec';
const DARK = '#1a1a1a';
const GRAY = '#666';
const GRAY_LIGHT = '#f8fafc';

const S = {
  page: {
    minHeight: '100vh',
    background: '#fff',
    color: DARK,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // ===== NAVBAR =====
  navbar: {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    zIndex: 1000,
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    transition: 'all 0.3s',
    borderBottom: '1px solid transparent',
  },
  navbarScrolled: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderBottom: '1px solid #f5d0e0',
    boxShadow: '0 1px 12px rgba(0,0,0,0.04)',
  },
  navInner: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  navLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  navLogo: { width: 36, height: 36, borderRadius: 8, objectFit: 'cover' },
  navBrand: { fontSize: 17, fontWeight: 800, color: DARK, letterSpacing: '-0.3px' },
  navLinks: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  navLink: {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '8px 12px', fontSize: 14, fontWeight: 600,
    color: '#555', borderRadius: 8,
  },
  navRight: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  langToggle: {
    display: 'flex', gap: 2, background: '#f1f5f9',
    borderRadius: 20, padding: 3,
  },
  langBtn: {
    background: 'none', border: 'none', padding: '5px 12px',
    fontSize: 12, fontWeight: 700, color: '#94a3b8',
    cursor: 'pointer', borderRadius: 16,
  },
  langBtnActive: { background: PINK, color: '#fff' },
  navLogin: {
    padding: '8px 16px', fontSize: 14, fontWeight: 700,
    color: DARK, textDecoration: 'none', borderRadius: 8,
  },
  navSignup: {
    padding: '8px 18px', fontSize: 14, fontWeight: 700,
    background: PINK, color: '#fff', textDecoration: 'none',
    borderRadius: 8,
  },

  // ===== HERO =====
  hero: {
    background: 'linear-gradient(145deg, #fce4ec 0%, #fdf0f5 50%, #fff 100%)',
    padding: '120px 20px 80px',
  },
  heroInner: {
    maxWidth: 1200,
    margin: '0 auto',
    display: 'flex',
    gap: 60,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  heroLeft: { flex: '1 1 400px', minWidth: 300 },
  heroH1: {
    fontSize: 'clamp(32px, 5vw, 56px)',
    fontWeight: 900,
    lineHeight: 1.1,
    margin: '0 0 20px',
    letterSpacing: '-1px',
    color: DARK,
  },
  heroSub: {
    fontSize: 18,
    lineHeight: 1.6,
    color: GRAY,
    margin: '0 0 32px',
    maxWidth: 540,
  },
  heroCtas: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 },
  trustRow: { display: 'flex', flexWrap: 'wrap', gap: '12px 24px' },
  trustItem: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 14, color: GRAY, fontWeight: 500,
  },
  trustCheck: { color: PINK, fontWeight: 900 },
  heroRight: {
    flex: '1 1 320px',
    display: 'flex',
    justifyContent: 'center',
    minWidth: 280,
  },
  phoneFrame: {
    width: 320,
    height: 640,
    background: '#1a1a1a',
    borderRadius: 40,
    padding: 12,
    boxShadow: '0 30px 80px rgba(233, 30, 99, 0.25), 0 10px 30px rgba(0,0,0,0.15)',
    transform: 'rotate(-3deg)',
  },
  phoneFrameSmall: {
    width: 220,
    height: 440,
    background: '#1a1a1a',
    borderRadius: 28,
    padding: 8,
    boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
    margin: '0 auto 20px',
  },
  phoneImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: 28,
  },

  // ===== STATS =====
  stats: { background: '#fff', padding: '60px 20px' },
  statsInner: { maxWidth: 1200, margin: '0 auto' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 20,
    marginTop: 32,
  },
  statCard: {
    background: PINK_LIGHT,
    borderRadius: 16,
    padding: '28px 20px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 900,
    color: PINK_DARK,
    marginBottom: 6,
  },
  statLabel: { fontSize: 14, color: GRAY, fontWeight: 500 },

  // ===== SECTIONS =====
  sectionInner: { maxWidth: 1200, margin: '0 auto', textAlign: 'center' },
  sectionH2: {
    fontSize: 'clamp(28px, 4vw, 42px)',
    fontWeight: 800,
    margin: '0 0 12px',
    color: DARK,
    letterSpacing: '-0.5px',
  },
  sectionSub: {
    fontSize: 17,
    color: GRAY,
    margin: '0 auto 48px',
    maxWidth: 600,
    lineHeight: 1.5,
  },

  // ===== FEATURES =====
  features: { background: GRAY_LIGHT, padding: '80px 20px' },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 24,
    textAlign: 'left',
  },
  featureCard: {
    background: '#fff',
    borderRadius: 16,
    padding: 28,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    border: '1px solid #f1f5f9',
  },
  featureIcon: {
    width: 48,
    height: 48,
    background: PINK_LIGHT,
    color: PINK,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 900,
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 800,
    margin: '0 0 8px',
    color: DARK,
  },
  featureDesc: {
    fontSize: 14.5,
    lineHeight: 1.6,
    color: GRAY,
    margin: 0,
  },

  // ===== HOW =====
  how: { background: '#fff', padding: '80px 20px' },
  howGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 32,
    marginTop: 16,
  },
  howStep: { textAlign: 'center', padding: '0 16px' },
  howNum: {
    width: 56,
    height: 56,
    margin: '0 auto 20px',
    background: PINK,
    color: '#fff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 900,
    boxShadow: '0 8px 20px rgba(233, 30, 99, 0.3)',
  },
  howTitle: {
    fontSize: 20,
    fontWeight: 800,
    margin: '0 0 10px',
    color: DARK,
  },
  howDesc: { fontSize: 15, lineHeight: 1.6, color: GRAY, margin: 0 },

  // ===== SHOWCASE =====
  showcase: {
    background: 'linear-gradient(145deg, #fdf0f5, #fff)',
    padding: '80px 20px',
  },
  showcaseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 32,
    marginTop: 8,
  },
  showcaseCard: { textAlign: 'center' },
  showcaseTitle: {
    fontSize: 20,
    fontWeight: 800,
    margin: '0 0 6px',
    color: DARK,
  },
  showcaseDesc: { fontSize: 14.5, color: GRAY, margin: 0, lineHeight: 1.5 },

  // ===== WHY US =====
  whyUs: { background: '#fff', padding: '80px 20px' },
  whyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 24,
    textAlign: 'left',
    marginTop: 16,
  },
  whyCard: {
    padding: 28,
    background: PINK_LIGHT,
    borderRadius: 16,
    borderLeft: `4px solid ${PINK}`,
  },
  whyTitle: {
    fontSize: 19,
    fontWeight: 800,
    margin: '0 0 10px',
    color: PINK_DARK,
  },
  whyDesc: { fontSize: 15, lineHeight: 1.6, color: '#444', margin: 0 },

  // ===== PRICING =====
  pricing: { background: GRAY_LIGHT, padding: '80px 20px' },
  pricingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 24,
    marginTop: 8,
    textAlign: 'left',
    alignItems: 'stretch',
  },
  pricingCard: {
    background: '#fff',
    borderRadius: 20,
    padding: '32px 28px',
    border: '2px solid #f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  pricingCardHighlight: {
    border: `2px solid ${PINK}`,
    boxShadow: '0 12px 40px rgba(233, 30, 99, 0.15)',
    transform: 'scale(1.02)',
  },
  pricingBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: 'translateX(-50%)',
    background: PINK,
    color: '#fff',
    padding: '4px 16px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '1px',
  },
  pricingName: {
    fontSize: 13,
    fontWeight: 800,
    color: PINK,
    letterSpacing: '1.5px',
    marginBottom: 8,
  },
  pricingPriceRow: { display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 24 },
  pricingPrice: { fontSize: 40, fontWeight: 900, color: DARK },
  pricingPeriod: { fontSize: 14, color: GRAY },
  pricingList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 28px',
    flex: 1,
  },
  pricingItem: {
    display: 'flex',
    gap: 10,
    fontSize: 14.5,
    color: '#444',
    padding: '8px 0',
    lineHeight: 1.5,
    alignItems: 'flex-start',
  },
  pricingCheck: { color: PINK, fontWeight: 900, flexShrink: 0 },

  // ===== FAQ =====
  faq: { background: '#fff', padding: '80px 20px' },
  faqInner: { maxWidth: 800, margin: '0 auto', textAlign: 'center' },
  faqList: { marginTop: 32, textAlign: 'left' },
  faqItem: {
    borderBottom: '1px solid #e5e7eb',
  },
  faqQuestion: {
    width: '100%',
    background: 'none',
    border: 'none',
    padding: '20px 4px',
    fontSize: 16,
    fontWeight: 700,
    color: DARK,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  faqAnswer: {
    padding: '0 4px 20px',
    fontSize: 15,
    lineHeight: 1.6,
    color: GRAY,
  },

  // ===== FINAL CTA =====
  finalCta: {
    background: `linear-gradient(135deg, ${PINK} 0%, ${PINK_DARK} 100%)`,
    padding: '80px 20px',
    color: '#fff',
    textAlign: 'center',
  },
  finalCtaInner: { maxWidth: 700, margin: '0 auto' },
  finalH2: {
    fontSize: 'clamp(28px, 4vw, 42px)',
    fontWeight: 900,
    margin: '0 0 16px',
    letterSpacing: '-0.5px',
  },
  finalSub: {
    fontSize: 17,
    margin: '0 0 32px',
    opacity: 0.95,
    lineHeight: 1.5,
  },
  finalNote: {
    fontSize: 13,
    marginTop: 16,
    opacity: 0.8,
  },

  // ===== FOOTER =====
  footer: { background: '#0f172a', color: '#cbd5e1', padding: '60px 20px 24px' },
  footerInner: { maxWidth: 1200, margin: '0 auto' },
  footerTop: {
    display: 'flex',
    gap: 60,
    paddingBottom: 40,
    borderBottom: '1px solid #1e293b',
    flexWrap: 'wrap',
  },
  footerBrand: { flex: '1 1 280px', minWidth: 240 },
  footerLogo: { width: 48, height: 48, borderRadius: 10, marginBottom: 12 },
  footerTagline: {
    fontSize: 14,
    color: '#94a3b8',
    margin: 0,
    lineHeight: 1.6,
    maxWidth: 280,
  },
  footerCols: { display: 'flex', gap: 60, flexWrap: 'wrap' },
  footerCol: { display: 'flex', flexDirection: 'column', gap: 10 },
  footerColTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: '0 0 6px',
  },
  footerLink: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: 14,
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left',
    textDecoration: 'none',
  },
  footerBottom: {
    paddingTop: 24,
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },

  // ===== BUTTONS =====
  btnPrimary: {
    display: 'inline-block',
    padding: '14px 28px',
    background: PINK,
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    textDecoration: 'none',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(233, 30, 99, 0.3)',
    textAlign: 'center',
  },
  btnPrimaryLarge: {
    display: 'inline-block',
    padding: '18px 40px',
    background: '#fff',
    color: PINK,
    fontSize: 17,
    fontWeight: 800,
    textDecoration: 'none',
    borderRadius: 14,
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    textAlign: 'center',
  },
  btnSecondary: {
    display: 'inline-block',
    padding: '14px 28px',
    background: 'rgba(255,255,255,0.7)',
    color: DARK,
    fontSize: 15,
    fontWeight: 700,
    textDecoration: 'none',
    borderRadius: 12,
    border: '1px solid #f5d0e0',
    textAlign: 'center',
  },
  btnOutline: {
    display: 'inline-block',
    padding: '14px 28px',
    background: '#fff',
    color: PINK,
    fontSize: 15,
    fontWeight: 700,
    textDecoration: 'none',
    borderRadius: 12,
    border: `2px solid ${PINK}`,
    textAlign: 'center',
  },
};
