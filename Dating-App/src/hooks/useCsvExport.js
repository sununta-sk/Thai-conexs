// src/hooks/useCSVExport.js
// CSV export สำหรับ user list, subscription list, commissions list

export function useCSVExport() {

    /**
     * exportCSV({ filename, headers, rows })
     * headers: string[]
     * rows: (string | number | null | undefined)[][]
     */
    const exportCSV = ({ filename, headers, rows }) => {
      const escape = (v) => {
        if (v === null || v === undefined) return '""';
        const str = String(v).replace(/"/g, '""');
        return `"${str}"`;
      };
  
      const csv = [
        headers.map(escape).join(','),
        ...rows.map(row => row.map(escape).join(',')),
      ].join('\n');
  
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };
  
    // ── User List export ───────────────────────────────────────────────────────
    const exportUsers = (users) => exportCSV({
      filename: 'users',
      headers: ['ID', 'Email', 'Display Name', 'Country', 'Plan', 'Status', 'Report Count', 'Joined'],
      rows: users.map(u => [
        u.id,
        u.email,
        u.display_name || '',
        u.country || '',
        u.plan_name || 'free',
        u.is_banned ? 'banned' : u.suspended_until ? 'suspended' : 'active',
        u.report_count || 0,
        u.created_at ? new Date(u.created_at).toLocaleDateString('th-TH') : '',
      ]),
    });
  
    // ── Subscription List export ───────────────────────────────────────────────
    const exportSubscriptions = (subs) => exportCSV({
      filename: 'subscriptions',
      headers: ['ID', 'User ID', 'Plan', 'Status', 'Amount', 'Currency', 'Processor', 'Period Start', 'Period End', 'Cancelled At'],
      rows: subs.map(s => [
        s.id,
        s.user_id,
        s.subscription_plans?.name || s.plan_name || '',
        s.status,
        s.amount_paid || 0,
        s.currency || 'USD',
        s.payment_processor || '',
        s.current_period_start ? new Date(s.current_period_start).toLocaleDateString('th-TH') : '',
        s.current_period_end   ? new Date(s.current_period_end).toLocaleDateString('th-TH')   : '',
        s.cancelled_at         ? new Date(s.cancelled_at).toLocaleDateString('th-TH')         : '',
      ]),
    });
  
    // ── Commissions List export ────────────────────────────────────────────────
    const exportCommissions = (commissions) => exportCSV({
      filename: 'commissions',
      headers: ['ID', 'Affiliate ID', 'Affiliate Name', 'Gross Amount', 'Commission Rate', 'Commission Amount', 'Currency', 'Status', 'Created At'],
      rows: commissions.map(c => [
        c.id,
        c.affiliate_id,
        c.affiliates?.contact_name || '',
        c.gross_amount || 0,
        c.commission_rate ? `${(c.commission_rate * 100).toFixed(1)}%` : '',
        c.commission_amount || 0,
        c.currency || 'USD',
        c.status,
        c.created_at ? new Date(c.created_at).toLocaleDateString('th-TH') : '',
      ]),
    });
  
    // ── Audit Log export ───────────────────────────────────────────────────────
    const exportAuditLog = (logs) => exportCSV({
      filename: 'audit_log',
      headers: ['ID', 'Admin', 'Action Type', 'Target Type', 'Target ID', 'IP Address', 'Created At'],
      rows: logs.map(l => [
        l.id,
        l.admin_users?.email || l.admin_user_id || '',
        l.action_type,
        l.target_type,
        l.target_id || '',
        l.ip_address || '',
        l.created_at ? new Date(l.created_at).toLocaleString('th-TH') : '',
      ]),
    });
  
    return { exportCSV, exportUsers, exportSubscriptions, exportCommissions, exportAuditLog };
  }