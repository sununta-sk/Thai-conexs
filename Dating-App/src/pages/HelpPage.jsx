import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const FAQ_ITEMS = [
  {
    q: 'Cancel paid membership',
    a: 'To cancel your paid membership: go to Account Settings > Subscription, then click "Cancel Subscription". Your membership will remain active until the end of your current billing cycle. You can also email us at support@thai-conexs.com if you need help canceling.',
  },
  {
    q: 'How to close or delete your account',
    a: 'You can close or delete your account from Account Settings. "Close" will hide your profile but you can re-open it anytime by logging in again. "Delete forever" will permanently remove all your photos, messages, and data — this action cannot be undone.',
  },
  {
    q: 'Log in problems / How to log in',
    a: 'To log in, enter the email and password you used when signing up. If you signed up with Google, click "Continue with Google" instead. If you forgot your passwor click "Forgot password" on the login page to receive a reset link.',
  },
  {
    q: "Can't Login?",
    a: 'If you cannot log in: 1) Check that your email is spelled correctly. 2) Make sure Caps Lock is off. 3) Try resetting your password using "Forgot password". 4) Clear your browser cache and try again. 5) If you still cannot log in, contact us using the form below with your username.',
  },
  {
    q: 'Not Receiving Email',
    a: 'If you are not receiving emails from us: 1) Check your spam/junk folder. 2) Add support@thai-conexs.com to your contacts. 3) Make sure your email is correct in Account Settings. 4) Some email providers (especially Hotmail/Outlook) delay our emails — please wait 5-10 minutes. If still nothing arrives, contact us below.',
  },
  {
    q: 'Change/confirm Email Address',
    a: 'To change your email: go to Account Settings > Change email > enter your new email > click "Change email". A verification link will be sent to the new email. Click the link to confirm the change. Your d email will continue to work until you confirm the new one.',
  },
  {
    q: 'How to Block/Unblock users',
    a: 'To block a user: go to their profile > click the three dots (···) menu > select "Block User". They will no longer be able to message you or see your profile. To unblock: go to Account Settings > Block list > click "Unblock" next to their username.',
  },
  {
    q: 'Report a Profile',
    a: 'To report a fake or inappropriate profile: open a chat with the user > click the three dots (···) menu in the chat header > select "Report User" > choose a reason (harassment, fake profile, inappropriate photo, spam, scam, underage, other) > click "Send Report". Our moderation team reviews all reports within 24 hours.',
  },
  {
    q: 'Problems uploading photo',
    a: 'If you cannot upload photos: 1) Make sure the file is JPG, PNG, or WEBP format. 2) File size must be under 10MB. 3) Check your internet connection. 4) Try a different browser (Chrome works best). 5) Photos go through moderation andake a few minutes to appear. If the problem persists, contact us below with details.',
  },
];

const SUBJECT_OPTIONS = [
  'Member Support',
  'Bug Report',
  'Account / Login Issue',
  'Payment / Subscription',
  'Report Abuse',
  'Feature Request',
  'Other',
];

export default function HelpPage() {
  const [openIdx, setOpenIdx] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');

  // form state
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Member Support');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        setUser(u);
        setEmail(u.email || '');
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', u.id)
          .maybeSingle();
        if (profile?.username) setUsername(profile.username);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) {
      alert('Please fill in email and message');
      return;
    }
    setSending(true);
    const { error } = await supabase.from('support_tickets').insert({
      user_id: user?.id || null,
      subject: subject + (username ? ' [' + username + ']' : ''),
      message: 'From: ' + email + '\n\n' + message,
      status: 'open',
      priority: 'medium',
    });
    setSending(false);
    if (error) {
      alert('Error sending: ' + error.message);
    } else {
      setSent(true);
      setMessage('');
      setTimeout(() => setSent(false), 5000);
    }
  };

  const filteredFAQ = searchQuery
    ? FAQ_ITEMS.filter(item =>
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : FAQ_ITEMS;

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <h1 style={S.title}>Help & Support</h1>
        <p style={S.subtitle}>Find answers to common questions or contact our support team</p>

        {/* Search bar */}
        <input
          type="text"
          placeholder="How can we help you?"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={S.searchInput}
        />

        {/* FAQ Accordion */}
        <div style={S.faqList}>
          {filteredFAQ.length === 0 ? (
            <div style={S.noResults}>No results found for "{searchQuery}"</div>
          ) : (
            filteredFAQ.map((item, idx) => (
              <div key={idx} style={S.faqItem}>
                <button
                  onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                  style={{ ...S.faqQuestion, background: openIdx === idx ? 'rgba(233, 30, 99, 0.15)' : '#0f172a' }}>
                  <span>{item.q}</span>
                  <span style={{ fontSize: 18, color: '#e91e63', transition: 'transform 0.2s', transform: openIdx === idx ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
                </button>
                {openIdx === idx && (
                  <div style={S.faqAnswer}>{item.a}</div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Contact Form */}
        <div style={S.contactCard}>
          <p style={S.contactIntro}>
            Still have questions or want to contact us about something else?<br />
            Please use the form below. Replies are usually within 24 hours.
          </p>

          <form onSubmit={handleSubmit} style={S.form}>
            <div>
              <label style={S.label}>Email (required)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={S.input}
                pceholder="your@email.com"
              />
            </div>

            {username && (
              <div>
                <label style={S.label}>Username</label>
                <input value={username} disabled style={{ ...S.input, opacity: 0.6 }} />
              </div>
            )}

            <div>
              <label style={S.label}>Subject</label>
              <select value={subject} onChange={e => setSubject(e.target.value)} style={S.input}>
                {SUBJECT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div>
              <label style={S.label}>Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={6}
                style={{ ...S.input, resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Describe your issue or question here..."
              />
            </div>

            {sent && (
              <div style={S.successMsg}>
                ✓ Your message has been sent! We will reply within 24 hours.
              </div>
            )}

            <button type="submit" disabled={sending} style={S.submitBtn}>
              {sending ? 'Sending...' : 'Submit'}
            </button>
          </form>

          <p style={S.altEmail}>
            Alternatively email us at <a href="mailto:support@thai-conexs.com" style={S.emailLink}>support@thai-conexs.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}

const S = {
  page: { background: '#0f172a', minHeight: '100vh', paddingTop: 90, paddingBottom: 60 },
  wrap: { maxWidth: 800, margin: '0 auto', padding: '0 20px' },
  title: { color: '#f1f5f9', fontSize: 28, fontWeight: 800, margin: '0 0 6px' },
  subtitle: { color: '#64748b', fontSize: 14, margin: '0 0 28px' },

  searchInput: {
    width: '100%', padding: '14px 18px', borderRadius: 12,
    border: '1px solid #334155', background: '#1e293b',
    colo '#f1f5f9', fontSize: 15, outline: 'none',
    boxSizing: 'border-box', marginBottom: 24,
  },

  faqList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 },
  faqItem: {
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: 12, overflow: 'hidden',
  },
  faqQuestion: {
    width: '100%', padding: '14px 18px', border: 'none',
    color: '#f1f5f9', fontWeight: 700, fontSize: 15, textAlign: 'left',
    cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', transition: 'background 0.15s',
  },
  faqAnswer: {
    padding: '0 18px 16px', color: '#cbd5e1', fontSize: 14,
    lineHeight: 1.7, background: '#1e293b',
  },
  noResults: { padding: 30, textAlign: 'center', color: '#64748b', fontSize: 14 },

  contactCard: {
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: 16, padding: 28,
  },
  contactIntro: {
    color: '#cbd5e1', fontSize: 14, lineHeight: 1.6,
    margin: '0 0 24px', textAlign: 'center',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1px solid #334155', background: '#0f172a',
    color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  },
  submitBtn: {
    padding: '14px 24px', borderRadius: 30, border: 'none',
    background: 'linear-gradient(135deg, #e91e63, #c2185b)',
    color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(233, 30, 99, 0.4)', marginTop: 8,
  },
  successMsg: {
    background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e',
    color: '#4ade80', padding: '10px 14px', borderRadius: 10,
    fontSize: 13, fontWeight: 600, textAlign: 'center',
  },
  altEmail: {
    marginTop: 20, textAlign: 'center', color: '#94a3b8',
    fontSize: 13, margin: '20px 0 0',
  },
  emailLink: { color: '#e91e63', fontWeight: 700, textDecoration: 'none' },
};
