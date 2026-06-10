import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';

const CONTENT = {
  en: {
    title: 'Community Rules',
    subtitle: 'Please read carefully before using Thai Conexns',
    lastUpdated: 'Last updated: May 2026',
    back: 'Back',
    agree: 'By using Thai Conexns you agree to follow these rules.',
    sections: [
      {
        heading: '1. The Most Important Rule — No Commercial Sex Work',
        items: [
          'Thai Conexns is a dating platform for genuine connections — NOT a marketplace for sex. Selling, advertising, soliciting, or arranging paid sexual services in any form (in your profile, photos, or chat messages) is strictly forbidden. Violators are PERMANENTLY BANNED immediately, with no warning, no appeal, and no refund.',
        ],
      },
      {
        heading: '2. Account & Identity',
        items: [
          'You must be 18 years or older to use Thai Conexns.',
          'One account per person. Duplicate accounts will be removed.',
          'Profile photos must be of you — real, recent, and unedited beyond minor filters.',
          'Stolen photos, celebrities, or AI-generated faces are not allowed.',
          'Face verification may be required at any time.',
        ],
      },
      {
        heading: '3. Respectful Behavior',
        items: [
          'Treat every member with respect, regardless of gender, age, nationality, or beliefs.',
          'No harassment, threats, intimidation, or repeated unwanted contact.',
          'No discriminatory language — racism, sexism, homophobia, transphobia.',
          'If someone asks you to stop, stop.',
        ],
      },
      {
        heading: '4. Other Prohibited Content',
        items: [
          'No escort services or "sugar" arrangements presented as paid services.',
          'No nudity or sexually explicit photos in profile or chat.',
          'No minors in any photo, even fully clothed.',
          'No violence, gore, weapons, or illegal substances.',
          'No links to external dating sites, escort sites, or paid adult content.',
          'No spam, advertising, or repeated promotional messages.',
        ],
      },
      {
        heading: '5. Honesty & Scams',
        items: [
          'No catfishing — pretending to be someone you are not.',
          'No requests for money, gifts, bank details, or cryptocurrency.',
          'No romance scams, investment pitches, or business solicitations.',
          'Report suspicious accounts using the report button on any profile.',
        ],
      },
      {
        heading: '6. Safety First',
        items: [
          'Never share your address, ID card, banking details, or passwords.',
          'Be cautious before meeting in person — meet in public places first.',
          'Tell a friend where you are going and who you are meeting.',
          'Trust your instincts. If something feels wrong, block and report.',
        ],
      },
      {
        heading: '7. Enforcement',
        items: [
          'Minor violations: warning.',
          'Repeated or serious violations: temporary suspension (1 hour to 30 days).',
          'Severe violations result in PERMANENT BAN with no refund. This includes: Rule 1 violations (commercial sex work), scams, content involving minors, and credible threats.',
          'Ban decisions are at the discretion of our moderation team.',
          'Banned users may not create new accounts. Doing so is itself a violation.',
        ],
      },
      {
        heading: '8. Reporting',
        items: [
          'Use the report button on any profile or message.',
          'Reports are reviewed within 24–48 hours.',
          'False or malicious reports may themselves result in suspension.',
        ],
      },
      {
        heading: '9. Contact',
        items: [
          'Questions or appeals: support@thai-conexns.com',
          'Appeals must include your account email and a clear explanation.',
        ],
      },
    ],
  },
  th: {
    title: 'กฎของชุมชน',
    subtitle: 'กรุณาอ่านอย่างละเอียดก่อนใช้งาน Thai Conexns',
    lastUpdated: 'อัปเดตล่าสุด: พฤษภาคม 2026',
    back: 'ย้อนกลับ',
    agree: 'การใช้ Thai Conexns ถือว่าคุณยอมรับและจะปฏิบัติตามกฎเหล่านี้',
    sections: [
      {
        heading: '1. กฎสำคัญที่สุด — ห้ามค้าประเวณี',
        items: [
          'Thai Conexns เป็นเว็บหาคู่เพื่อความสัมพันธ์จริง ไม่ใช่ตลาดขายบริการทางเพศ ห้ามขาย โฆษณา ชักชวน หรือนัดแลกเปลี่ยนเซ็กส์กับเงิน/ของขวัญ/ผลประโยชน์ในรูปแบบใดๆ (ในโปรไฟล์ รูป หรือแชท) ผู้ฝ่าฝืนจะถูกแบนถาวรทันที ไม่มีเตือน ไม่มีอุทธรณ์ และไม่คืนเงิน',
        ],
      },
      {
        heading: '2. บัญชีและตัวตน',
        items: [
          'ต้องมีอายุ 18 ปีขึ้นไปจึงจะใช้ Thai Conexns ได้',
          'หนึ่งคนต่อหนึ่งบัญชี บัญชีซ้ำจะถูกลบ',
          'รูปโปรไฟล์ต้องเป็นรูปของคุณจริง ถ่ายมาไม่นาน ไม่ตัดต่อหนัก',
          'ห้ามใช้รูปคนอื่น รูปดารา หรือรูปที่สร้างจาก AI',
          'อาจถูกขอให้ยืนยันใบหน้าได้ตลอดเวลา',
        ],
      },
      {
        heading: '3. การปฏิบัติต่อสมาชิกอื่น',
        items: [
          'ปฏิบัติต่อสมาชิกทุกคนด้วยความเคารพ ไม่ว่าจะเพศ อายุ สัญชาติ หรือความเชื่อใด',
          'ห้ามคุกคาม ข่มขู่ หรือติดต่อซ้ำเมื่ออีกฝ่ายไม่ตอบรับ',
          'ห้ามใช้ถ้อยคำเหยียดเชื้อชาติ เพศ หรือกลุ่ม LGBTQ+',
          'ถ้าอีกฝ่ายขอให้หยุด ต้องหยุด',
        ],
      },
      {
        heading: '4. เนื้อหาต้องห้ามอื่นๆ',
        items: [
          'ห้ามให้บริการ escort หรือ "ชูก้า" ที่ตกลงจ่ายเงินเป็นบริการ',
          'ห้ามภาพเปลือยหรือรูปทางเพศในโปรไฟล์และในแชท',
          'ห้ามรูปที่มีเด็กในรูปใดๆ แม้จะใส่เสื้อผ้าครบ',
          'ห้ามรูปความรุนแรง อาวุธ หรือยาเสพติด',
          'ห้ามลิงก์ไปเว็บหาคู่อื่น เว็บ escort หรือเนื้อหาผู้ใหญ่ที่ต้องจ่ายเงิน',
          'ห้ามสแปม โฆษณา หรือส่งข้อความโปรโมตซ้ำๆ',
        ],
      },
      {
        heading: '5. ความซื่อสัตย์และการหลอกลวง',
        items: [
          'ห้ามปลอมเป็นคนอื่น (catfishing)',
          'ห้ามขอเงิน ของขวัญ ข้อมูลธนาคาร หรือคริปโต',
          'ห้ามหลอกความรัก ชวนลงทุน หรือชวนทำธุรกิจ',
          'แจ้งบัญชีน่าสงสัยได้โดยใช้ปุ่ม Report ในโปรไฟล์',
        ],
      },
      {
        heading: '6. ความปลอดภัย',
        items: [
          'อย่าให้ที่อยู่ บัตรประชาชน ข้อมูลธนาคาร หรือรหัสผ่านกับใคร',
          'ก่อนนัดเจอ ระวังไว้ก่อน นัดเจอที่สาธารณะครั้งแรก',
          'บอกเพื่อนว่าจะไปไหน ไปเจอใคร',
          'เชื่อสัญชาตญาณตัวเอง ถ้ารู้สึกผิดปกติ บล็อกและแจ้งทันที',
        ],
      },
      {
        heading: '7. บทลงโทษ',
        items: [
          'ละเมิดเล็กน้อย: เตือน',
          'ละเมิดซ้ำหรือร้ายแรง: ระงับชั่วคราว (1 ชั่วโมง ถึง 30 วัน)',
          'ละเมิดรุนแรง: แบนถาวรไม่คืนเงิน รวมถึง: การฝ่าฝืนกฎข้อ 1 (ค้าบริการทางเพศ), หลอกลวง, เนื้อหาเกี่ยวข้องผู้เยาว์, ข่มขู่อย่างจริงจัง',
          'การตัดสินใจขึ้นอยู่กับทีม moderation',
          'ผู้ถูกแบนห้ามสมัครบัญชีใหม่ การสมัครซ้ำคือการละเมิดเพิ่มเติม',
        ],
      },
      {
        heading: '8. การแจ้งปัญหา',
        items: [
          'ใช้ปุ่ม Report ในโปรไฟล์หรือข้อความที่มีปัญหา',
          'รายงานจะได้รับการตรวจสอบภายใน 24–48 ชั่วโมง',
          'รายงานเท็จหรือกลั่นแกล้งอาจทำให้ถูกระงับเอง',
        ],
      },
      {
        heading: '9. ติดต่อ',
        items: [
          'คำถามหรืออุทธรณ์: support@thai-conexns.com',
          'การอุทธรณ์ต้องระบุอีเมลบัญชีและเหตุผลให้ชัดเจน',
        ],
      },
    ],
  },
};

export default function RulesPage() {
  const { lang, setLang } = useTranslation(['common']);
  const navigate = useNavigate();
  const c = CONTENT[lang === 'th' ? 'th' : 'en'];

  return (
    <div style={S.page}>
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={() => navigate(-1)}>
          \u2190 {c.back}
        </button>
        <div style={S.langToggle}>
          <button
            type="button"
            style={{ ...S.langBtn, ...(lang === 'en' ? S.langBtnActive : {}) }}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button
            type="button"
            style={{ ...S.langBtn, ...(lang === 'th' ? S.langBtnActive : {}) }}
            onClick={() => setLang('th')}
          >
            TH
          </button>
        </div>
      </div>

      <div style={S.container}>
        <h1 style={S.title}>{c.title}</h1>
        <p style={S.subtitle}>{c.subtitle}</p>
        <p style={S.lastUpdated}>{c.lastUpdated}</p>

        {c.sections.map((sec, i) => {
          const isCritical = i === 0;
          return (
            <section
              key={i}
              style={{ ...S.section, ...(isCritical ? S.sectionCritical : {}) }}
            >
              <h2 style={{ ...S.heading, ...(isCritical ? S.headingCritical : {}) }}>
                {sec.heading}
              </h2>
              <ul style={S.list}>
                {sec.items.map((item, j) => (
                  <li
                    key={j}
                    style={{
                      ...S.listItem,
                      ...(isCritical ? S.listItemCritical : {}),
                    }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <div style={S.footer}>
          <p style={S.footerText}>{c.agree}</p>
        </div>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(145deg, #fce4ec, #fdf0f5)',
    paddingBottom: 60,
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid #f5d0e0',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#e91e63',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '6px 10px',
  },
  langToggle: {
    display: 'flex',
    gap: 4,
    background: '#fff',
    borderRadius: 20,
    padding: 3,
    border: '1px solid #f5d0e0',
  },
  langBtn: {
    background: 'none',
    border: 'none',
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 700,
    color: '#999',
    cursor: 'pointer',
    borderRadius: 16,
  },
  langBtnActive: {
    background: '#e91e63',
    color: '#fff',
  },
  container: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '32px 24px',
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    color: '#1a1a1a',
    margin: '0 0 8px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    margin: '0 0 4px',
    lineHeight: 1.5,
  },
  lastUpdated: {
    fontSize: 13,
    color: '#999',
    margin: '0 0 32px',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 28,
    background: '#fff',
    borderRadius: 14,
    padding: '20px 22px',
    boxShadow: '0 2px 8px rgba(233, 30, 99, 0.06)',
    border: '1px solid #fce4ec',
  },
  sectionCritical: {
    background: '#fff5f5',
    border: '2px solid #fca5a5',
    boxShadow: '0 6px 16px rgba(220, 38, 38, 0.15)',
    padding: '24px 22px',
  },
  heading: {
    fontSize: 18,
    fontWeight: 700,
    color: '#e91e63',
    margin: '0 0 12px',
  },
  headingCritical: {
    color: '#dc2626',
    fontSize: 19,
  },
  list: {
    margin: 0,
    paddingLeft: 20,
  },
  listItem: {
    fontSize: 14.5,
    lineHeight: 1.7,
    color: '#333',
    marginBottom: 6,
  },
  listItemCritical: {
    fontWeight: 700,
    color: '#991b1b',
    background: '#fee2e2',
    padding: '12px 14px',
    borderRadius: 8,
    marginBottom: 0,
    marginLeft: -8,
    listStyle: 'none',
    border: '1px solid #fca5a5',
    fontSize: 15,
    lineHeight: 1.65,
  },
  footer: {
    marginTop: 40,
    padding: '20px',
    background: '#fff',
    borderRadius: 14,
    textAlign: 'center',
    border: '1px solid #fce4ec',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    margin: 0,
    fontStyle: 'italic',
    lineHeight: 1.6,
  },
};
