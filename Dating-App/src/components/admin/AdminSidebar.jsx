import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Image, FileText, Flag,
  Users2, DollarSign, BarChart2, CreditCard,
  Settings, Megaphone, Shield, Activity,
  ExternalLink, LogOut,
} from 'lucide-react'
import { useRealtimeBadges } from '../../hooks/useRealtimeBadges'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import { supabase } from '../../lib/supabaseClient'

function Badge({ count }) {
  if (!count) return null
  return (
    <span style={{
      background: '#ef4444', color: '#fff',
      fontSize: 11, fontWeight: 700,
      padding: '1px 6px', borderRadius: 20,
      minWidth: 18, textAlign: 'center',
      lineHeight: '18px', display: 'inline-block',
    }}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

function NavItem({ to, icon: Icon, label, badge }) {
  return (
    <NavLink to={to} style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 14px', borderRadius: 9, textDecoration: 'none',
      fontSize: 14, fontWeight: 500,
      color: isActive ? '#111' : '#6b7280',
      background: isActive ? '#f3f4f6' : 'transparent',
      transition: 'background 0.15s, color 0.15s',
    })}>
      <Icon size={17} strokeWidth={1.8} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge > 0 && <Badge count={badge} />}
    </NavLink>
  )
}

function SectionLabel({ label }) {
  return (
    <p style={{ margin: '16px 14px 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
      {label}
    </p>
  )
}

export default function AdminSidebar() {
  const { admin } = useAdminAuth()
  const { photoPending, openTickets, openReports, pendingPayouts } = useRealtimeBadges()
  const isSuperAdmin = admin?.admin_roles?.name === 'super_admin'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  return (
    <aside style={{
      width: 220, flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
      background: '#fff', borderRight: '1px solid #f3f4f6',
      display: 'flex', flexDirection: 'column', padding: '20px 12px',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '0 4px 20px', borderBottom: '1px solid #f3f4f6', marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#111', letterSpacing: -0.5 }}>Thai Conexns</p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>Admin Portal</p>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <NavItem to="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" />

        <SectionLabel label="Users" />
        <NavItem to="/admin/users" icon={Users} label="All Users" />

        <SectionLabel label="Moderation" />
        <NavItem to="/admin/moderation/photos"  icon={Image}    label="Photo Queue" badge={photoPending} />
        <NavItem to="/admin/moderation/reports" icon={Flag}     label="Reports"     badge={openReports} />
        <NavItem to="/admin/moderation/tickets" icon={FileText} label="Tickets"     badge={openTickets} />

        <SectionLabel label="Affiliates" />
        <NavItem to="/admin/affiliates" icon={Users2}     label="Affiliates" />
        <NavItem to="/admin/payouts"    icon={DollarSign} label="Payouts"    badge={pendingPayouts} />

        <SectionLabel label="Revenue" />
        <NavItem to="/admin/revenue"       icon={BarChart2}  label="Revenue" />
        <NavItem to="/admin/subscriptions" icon={CreditCard} label="Subscriptions" />
        <NavItem to="/admin/plans"         icon={CreditCard} label="Plans" />

        <SectionLabel label="Platform" />
        <NavItem to="/admin/platform/settings"      icon={Settings}  label="Settings" />
        <NavItem to="/admin/platform/announcements" icon={Megaphone} label="Announcements" />

        {isSuperAdmin && (
          <>
            <SectionLabel label="Admin" />
            <NavItem to="/admin/team"      icon={Shield}   label="Team" />
            <NavItem to="/admin/audit-log" icon={Activity} label="Audit Log" />
          </>
        )}
      </nav>

      {/* Bottom — avatar + View App + Sign Out */}
      {admin && (
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px 4px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: `hsl(${(admin.display_name || '').charCodeAt(0) * 5 % 360}, 55%, 82%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#374151',
            }}>
              {(admin.display_name || 'A')[0].toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {admin.display_name}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', textTransform: 'capitalize' }}>
                {admin.admin_roles?.name?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          {/* View App — เปิด tab ใหม่ไปหน้า user */}
          <a
            href="/discover"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 14px', borderRadius: 9, textDecoration: 'none',
              fontSize: 13, fontWeight: 600,
              background: '#f0fdf4', color: '#16a34a',
              border: '1px solid #bbf7d0',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#dcfce7'}
            onMouseLeave={e => e.currentTarget.style.background = '#f0fdf4'}
          >
            <ExternalLink size={15} />
            View App
          </a>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 14px', borderRadius: 9,
              fontSize: 13, fontWeight: 600,
              background: 'transparent', color: '#6b7280',
              border: '1px solid #f3f4f6',
              cursor: 'pointer', width: '100%',
              transition: 'background 0.15s, color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#fef2f2'
              e.currentTarget.style.color = '#dc2626'
              e.currentTarget.style.borderColor = '#fecaca'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#6b7280'
              e.currentTarget.style.borderColor = '#f3f4f6'
            }}
          >
            <LogOut size={15} />
            Sign Out
          </button>

        </div>
      )}
    </aside>
  )
}