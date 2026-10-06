/** Finance Control Center — server payload types (display-only; no client math). */

export type FinanceKpis = {
  total_coin_sales_try: number;
  total_coin_sold: number;
  today_sales_try: number;
  today_coins: number;
  today_delta_pct: number | null;
  month_sales_try: number;
  month_coins: number;
  month_delta_pct: number | null;
  user_coin_supply: number;
  platform_revenue_try: number;
  platform_expense_try: number;
  platform_net_try: number;
  net_delta_pct: number | null;
  total_liability_try: number;
  creator_payable_try: number;
  agency_payable_try: number;
  pending_withdrawals_try: number;
  pending_refunds_try: number;
};

export type FinanceLiveEvent = {
  id: string;
  event_type: string;
  user_id: string | null;
  agency_id: string | null;
  amount_coin: number | null;
  amount_try: number | null;
  title: string | null;
  subtitle: string | null;
  created_at: string;
};

export type FinanceAlert = {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  body: string | null;
  status: string;
  created_at: string;
  entity_type?: string | null;
  entity_id?: string | null;
};

export type FinanceOverview = {
  ok: boolean;
  generated_at: string;
  timezone: string;
  rates: Record<string, unknown>;
  kpis: FinanceKpis;
  month_end_estimate: {
    is_estimate: boolean;
    expected_revenue_try: number;
    expected_expense_try: number;
    expected_liability_try: number;
    expected_net_try: number;
  };
  live_activity: FinanceLiveEvent[];
  alerts: FinanceAlert[];
};

export type FinanceCoinEconomy = {
  ok: boolean;
  generated_at: string;
  total_coin_sold: number;
  user_coin_supply: number;
  total_coin_spent: number;
  total_coin_transferred: number;
  total_coin_refunded: number;
  total_bonus_coin: number;
  total_game_coin: number;
  total_promotional_coin: number;
  supply_breakdown: {
    purchased: number;
    bonus: number;
    game: number;
    other: number;
  };
};

export type FinancePeriod =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | 'month'
  | 'last_month'
  | 'all';

export const FINANCE_NAV = [
  { href: '/admin/finance', label: 'Özet', icon: 'grid-outline' as const },
  { href: '/admin/finance/coin-economy', label: 'Coin', icon: 'logo-bitcoin' as const },
  { href: '/admin/finance/coin-yonetim', label: 'Coin yönetimi', icon: 'swap-vertical-outline' as const },
  { href: '/admin/finance/sales', label: 'Satış', icon: 'trending-up-outline' as const },
  { href: '/admin/finance/users', label: 'Kullanıcılar', icon: 'people-outline' as const },
  { href: '/admin/finance/agencies', label: 'Ajanslar', icon: 'business-outline' as const },
  { href: '/admin/finance/creators', label: 'Creatorlar', icon: 'star-outline' as const },
  { href: '/admin/finance/revenue', label: 'Gelir', icon: 'cash-outline' as const },
  { href: '/admin/finance/expenses', label: 'Gider', icon: 'receipt-outline' as const },
  { href: '/admin/finance/liabilities', label: 'Borç', icon: 'alert-circle-outline' as const },
  { href: '/admin/finance/pnl', label: 'Kâr/Zarar', icon: 'analytics-outline' as const },
  { href: '/admin/finance/forecast', label: 'Tahmin', icon: 'calendar-outline' as const },
  { href: '/admin/finance/simulator', label: 'Simülatör', icon: 'flask-outline' as const },
  { href: '/admin/finance/reconciliation', label: 'Mutabakat', icon: 'git-compare-outline' as const },
  { href: '/admin/finance/transactions', label: 'Hareketler', icon: 'list-outline' as const },
  { href: '/admin/finance/alerts', label: 'Uyarılar', icon: 'warning-outline' as const },
  { href: '/admin/finance/reports', label: 'Raporlar', icon: 'document-text-outline' as const },
] as const;

export const REPORT_TYPES = [
  { key: 'DAILY_FINANCE', label: 'Günlük finans' },
  { key: 'MONTHLY_FINANCE', label: 'Aylık finans' },
  { key: 'COIN_SALES', label: 'Coin satış' },
  { key: 'USER_COIN', label: 'Kullanıcı coin' },
  { key: 'AGENCY_FINANCE', label: 'Ajans finans' },
  { key: 'CREATOR_EARNINGS', label: 'Creator kazanç' },
  { key: 'PLATFORM_PNL', label: 'Kâr / zarar' },
  { key: 'PLATFORM_LIABILITY', label: 'Yükümlülük' },
  { key: 'PAYOUT', label: 'Ödeme' },
  { key: 'REFUND_CHARGEBACK', label: 'İade / chargeback' },
  { key: 'RECONCILIATION', label: 'Mutabakat' },
  { key: 'TRANSACTION', label: 'İşlemler' },
  { key: 'COIN_ECONOMY', label: 'Coin ekonomisi' },
  { key: 'CUSTOM_FINANCE', label: 'Özel rapor' },
] as const;
