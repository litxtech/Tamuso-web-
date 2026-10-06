/**
 * Finance Control Center API — display-only wrappers.
 * All money math happens in admin_finance_* RPCs.
 */
import { supabase } from '../../../lib/supabase';
import type {
  FinanceCoinEconomy,
  FinanceOverview,
  FinancePeriod,
} from './tipler';

function asObj(data: unknown): any {
  return data && typeof data === 'object' ? data : {};
}

export async function AdminFinanceOverviewGetir(): Promise<FinanceOverview> {
  const { data, error } = await supabase.rpc('admin_finance_overview');
  if (error) throw new Error(error.message);
  return asObj(data) as FinanceOverview;
}

export async function AdminFinanceCoinEconomyGetir(): Promise<FinanceCoinEconomy> {
  const { data, error } = await supabase.rpc('admin_finance_coin_economy');
  if (error) throw new Error(error.message);
  return asObj(data) as FinanceCoinEconomy;
}

export async function AdminFinanceLiabilitiesGetir(): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_liabilities');
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceForecastGetir(): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_forecast');
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinancePnlGetir(): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_pnl');
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceRevenueGetir(period: FinancePeriod = 'month'): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_revenue', { p_period: period });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceSalesGetir(
  period: FinancePeriod = 'today',
  limit = 50,
): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_sales', {
    p_period: period,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceUsersGetir(
  limit = 40,
  offset = 0,
  q?: string,
): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_users', {
    p_limit: limit,
    p_offset: offset,
    p_q: q ?? null,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceUserProfileGetir(
  userId: string,
  limit = 80,
): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_user_profile', {
    p_user_id: userId,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceAgenciesGetir(
  limit = 50,
  offset = 0,
): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_agencies', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceAgencyDetailGetir(
  agencyId: string,
  limit = 50,
): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_agency_detail', {
    p_agency_id: agencyId,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceCreatorsGetir(
  limit = 50,
  offset = 0,
): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_creators', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceTransactionsGetir(limit = 50): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_transactions', {
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceExpensesListGetir(
  limit = 50,
  offset = 0,
): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_expenses_list', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceExpenseUpsert(payload: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_expense_upsert', { p: payload });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceSettingsGetir(): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_settings_get');
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceSettingsGuncelle(payload: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_settings_update', { p: payload });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceSimulate(coinAmount: number): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_simulate', {
    p_coin_amount: coinAmount,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceAlertsListGetir(status = 'open'): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_alerts_list', {
    p_status: status,
    p_limit: 50,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceAlertAck(id: string): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_alert_ack', { p_id: id });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceAnomalyScan(): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_anomaly_scan');
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceReconcileRun(
  source: string,
  externalAmount?: number | null,
  period: FinancePeriod = 'month',
): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_reconcile_run', {
    p_source: source,
    p_external_amount: externalAmount ?? null,
    p_period: period,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceSearch(q: string): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_search', {
    p_q: q,
    p_limit: 20,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceReportCreate(
  reportType: string,
  filters: Record<string, unknown> = {},
): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_report_create', {
    p_report_type: reportType,
    p_filters: filters,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceReportList(): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_report_list', { p_limit: 30 });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceReportGet(id: string): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_report_get', { p_id: id });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceReportAttachStorage(
  id: string,
  storagePath: string,
): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_report_attach_storage', {
    p_id: id,
    p_storage_path: storagePath,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceReportSignedUrlAudit(id: string): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_report_signed_url_audit', {
    p_id: id,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

/** Private PDF signed URL (short TTL). */
export async function AdminFinanceReportSignedUrlAl(
  jobId: string,
  storagePath: string,
  expiresIn = 600,
): Promise<string | null> {
  await AdminFinanceReportSignedUrlAudit(jobId);
  const { data, error } = await supabase.storage
    .from('finance-reports')
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw new Error(error.message);
  return data?.signedUrl ?? null;
}

export async function AdminFinanceCoinYonetimGetir(
  limit = 40,
  offset = 0,
  q?: string,
  filtre: 'all' | 'platform' | 'purchase' | 'balance' = 'all',
): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_coin_yonetim', {
    p_limit: limit,
    p_offset: offset,
    p_q: q ?? null,
    p_filtre: filtre,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function AdminFinanceCoinAyarla(girdi: {
  userId: string;
  islem: 'topup' | 'deduct' | 'reset' | 'set';
  miktar?: number;
  not?: string;
}): Promise<any> {
  const { data, error } = await supabase.rpc('admin_finance_coin_ayarla', {
    p_user_id: girdi.userId,
    p_islem: girdi.islem,
    p_miktar: girdi.miktar != null ? Math.floor(girdi.miktar) : null,
    p_not: girdi.not?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}
