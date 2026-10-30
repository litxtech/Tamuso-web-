-- Yayıncı ödemeleri: minimum $25.00, 15 günlük dönemler (1–15 / 16–ay sonu),
-- durum akışı: pending → under_review → approved → sent_to_bank → completed
-- ayrıca failed, cancelled ve on_hold (güvenlik incelemesi).
-- Ödeme talebi yalnızca withdrawals_enabled açık ve kill_withdrawal kapalıyken oluşturulabilir.

create table if not exists public.creator_payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  amount_usd numeric(14,2) not null check (amount_usd > 0),
  fee_usd numeric(14,2) not null default 0 check (fee_usd >= 0),
  net_usd numeric(14,2) not null check (net_usd >= 0),
  method text not null default 'bank_transfer' check (method in ('bank_transfer')),
  account_holder text,
  bank_name text,
  iban_masked text,
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'approved', 'sent_to_bank', 'completed', 'failed', 'cancelled', 'on_hold')),
  status_note text,
  failure_reason text,
  idempotency_key text not null unique,
  period_end date not null,
  reviewed_at timestamptz,
  approved_at timestamptz,
  sent_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists creator_payout_requests_one_open
  on public.creator_payout_requests (user_id)
  where status in ('pending', 'under_review', 'approved', 'sent_to_bank', 'on_hold');

create index if not exists creator_payout_requests_status_idx
  on public.creator_payout_requests (status, created_at);

alter table public.creator_payout_requests enable row level security;

drop policy if exists creator_payout_requests_own on public.creator_payout_requests;
create policy creator_payout_requests_own on public.creator_payout_requests
  for select to authenticated
  using (user_id = auth.uid() or public.ben_admin_miyim());

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'creator_earning_entries_payout_fk'
  ) then
    alter table public.creator_earning_entries
      add constraint creator_earning_entries_payout_fk
      foreign key (payout_request_id) references public.creator_payout_requests(id) on delete set null;
  end if;
end $$;

create table if not exists public.creator_payout_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.creator_payout_requests(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.creator_payout_events enable row level security;

drop policy if exists creator_payout_events_read on public.creator_payout_events;
create policy creator_payout_events_read on public.creator_payout_events
  for select to authenticated
  using (
    public.ben_admin_miyim()
    or exists (select 1 from public.creator_payout_requests r where r.id = request_id and r.user_id = auth.uid())
  );

-- Kayıt durumu (istemci ve özet için tek tanım)
create or replace function public.yayinci_kazanc_durumu(e public.creator_earning_entries)
returns text
language sql
stable
set search_path to 'public'
as $$
  select case
    when not e.eligible then 'ineligible'
    when e.paid_at is not null then 'paid'
    when e.payout_request_id is not null then 'in_payout'
    when e.hold_reason is not null then 'on_hold'
    when e.period_end >= (now() at time zone 'UTC')::date then 'pending'
    else 'available'
  end;
$$;

create or replace function public.yayinci_cekim_aktif_mi()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.ozellik_bayragi_aktif_mi('withdrawals_enabled')
     and not public.kill_switch_aktif_mi('kill_withdrawal');
$$;

grant execute on function public.yayinci_cekim_aktif_mi() to authenticated;

create or replace function public.yayinci_kazanc_ozeti()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_cfg public.platform_economy_config%rowtype;
  v jsonb;
  v_next_start date;
  v_today date := (now() at time zone 'UTC')::date;
  v_open public.creator_payout_requests%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_cfg from public.platform_economy_config where id = 1;

  select jsonb_build_object(
    'eligible_gross_usd', coalesce(sum(e.gross_usd) filter (where e.eligible), 0),
    'creator_share_usd', coalesce(sum(e.creator_usd) filter (where e.eligible), 0),
    'deductions_usd', coalesce(sum(e.deductions_usd) filter (where e.eligible), 0),
    'pending_usd', coalesce(sum(e.net_usd) filter (where public.yayinci_kazanc_durumu(e) = 'pending'), 0),
    'available_usd', coalesce(sum(e.net_usd) filter (where public.yayinci_kazanc_durumu(e) = 'available'), 0),
    'on_hold_usd', coalesce(sum(e.net_usd) filter (where public.yayinci_kazanc_durumu(e) = 'on_hold'), 0),
    'in_payout_usd', coalesce(sum(e.net_usd) filter (where public.yayinci_kazanc_durumu(e) = 'in_payout'), 0),
    'paid_usd', coalesce(sum(e.net_usd) filter (where public.yayinci_kazanc_durumu(e) = 'paid'), 0),
    'ineligible_count', count(*) filter (where not e.eligible),
    'by_channel', coalesce((
      select jsonb_object_agg(c.channel, c.total)
      from (
        select channel, sum(net_usd) as total
        from public.creator_earning_entries
        where creator_id = v_uid and eligible
        group by channel
      ) c
    ), '{}'::jsonb)
  ) into v
  from public.creator_earning_entries e
  where e.creator_id = v_uid;

  v_next_start := public.odeme_donemi_bit(now()) + 1;

  select * into v_open from public.creator_payout_requests
  where user_id = v_uid and status in ('pending', 'under_review', 'approved', 'sent_to_bank', 'on_hold')
  order by created_at desc limit 1;

  return v || jsonb_build_object(
    'currency', 'USD',
    'creator_share', coalesce(v_cfg.creator_share, 0.40),
    'platform_share', 1 - coalesce(v_cfg.creator_share, 0.40),
    'payout_min_usd', coalesce(v_cfg.payout_min_usd, 25.00),
    'payout_fee_usd', coalesce(v_cfg.payout_transfer_fee_usd, 0),
    'current_period_start', public.odeme_donemi_bas(now()),
    'current_period_end', public.odeme_donemi_bit(now()),
    'next_processing_date', v_next_start,
    'withdrawals_enabled', public.yayinci_cekim_aktif_mi(),
    'payout_method', 'bank_transfer',
    'open_request', case when v_open.id is null then null else to_jsonb(v_open) - 'idempotency_key' end
  );
end;
$$;

grant execute on function public.yayinci_kazanc_ozeti() to authenticated;

create or replace function public.yayinci_kazanc_kayitlari(
  p_channel text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  created_at timestamptz,
  source_type text,
  channel text,
  coin_source text,
  coins bigint,
  gross_usd numeric,
  creator_rate numeric,
  creator_usd numeric,
  agency_usd numeric,
  platform_usd numeric,
  deductions_usd numeric,
  net_usd numeric,
  eligible boolean,
  ineligible_reason text,
  status text,
  period_start date,
  period_end date,
  payer_name text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select e.id, e.created_at, e.source_type, e.channel, e.coin_source, e.coins,
         e.gross_usd, e.creator_rate, e.creator_usd, e.agency_usd, e.platform_usd,
         e.deductions_usd, e.net_usd, e.eligible, e.ineligible_reason,
         public.yayinci_kazanc_durumu(e), e.period_start, e.period_end,
         public.profil_gosterim_adi(e.payer_id)
  from public.creator_earning_entries e
  where e.creator_id = auth.uid()
    and (p_channel is null or e.channel = p_channel)
  order by e.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.yayinci_kazanc_kayitlari(text, int, int) to authenticated;

create or replace function public.yayinci_odeme_talebi_olustur(p_idempotency_key text)
returns public.creator_payout_requests
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_cfg public.platform_economy_config%rowtype;
  v_req public.creator_payout_requests%rowtype;
  v_amount numeric(14,2);
  v_fee numeric(14,2);
  v_kyc text;
  v_bank public.user_bank_accounts%rowtype;
  v_period_end date;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'Invalid idempotency key';
  end if;

  select * into v_req from public.creator_payout_requests
  where idempotency_key = p_idempotency_key and user_id = v_uid;
  if found then return v_req; end if;

  if not public.yayinci_cekim_aktif_mi() then
    raise exception 'withdrawals_unavailable';
  end if;

  if exists (
    select 1 from public.creator_payout_requests
    where user_id = v_uid and status in ('pending', 'under_review', 'approved', 'sent_to_bank', 'on_hold')
  ) then
    raise exception 'open_request_exists';
  end if;

  select kyc_status into v_kyc from public.wallet_accounts where user_id = v_uid;
  if coalesce(v_kyc, 'none') <> 'approved' then
    raise exception 'kyc_required';
  end if;

  select * into v_bank from public.user_bank_accounts where user_id = v_uid;
  if not found or coalesce(trim(v_bank.iban), '') = '' then
    raise exception 'bank_account_required';
  end if;

  if exists (
    select 1 from public.finance_risk_flags
    where user_id = v_uid and status = 'open' and severity = 'high'
  ) then
    raise exception 'security_review';
  end if;

  select * into v_cfg from public.platform_economy_config where id = 1;
  v_period_end := public.odeme_donemi_bas(now()) - 1;

  perform 1 from public.creator_earning_entries
  where creator_id = v_uid for update;

  select coalesce(sum(e.net_usd), 0) into v_amount
  from public.creator_earning_entries e
  where e.creator_id = v_uid and public.yayinci_kazanc_durumu(e) = 'available';

  v_amount := floor(v_amount * 100) / 100;
  if v_amount < coalesce(v_cfg.payout_min_usd, 25.00) then
    raise exception 'below_minimum';
  end if;

  v_fee := least(coalesce(v_cfg.payout_transfer_fee_usd, 0), v_amount);

  insert into public.creator_payout_requests (
    user_id, amount_usd, fee_usd, net_usd, account_holder, bank_name, iban_masked,
    idempotency_key, period_end
  ) values (
    v_uid, v_amount, v_fee, v_amount - v_fee, v_bank.account_holder, v_bank.bank_name,
    left(regexp_replace(v_bank.iban, '\s', '', 'g'), 4) || ' **** ' || right(regexp_replace(v_bank.iban, '\s', '', 'g'), 4),
    p_idempotency_key, v_period_end
  ) returning * into v_req;

  update public.creator_earning_entries e
    set payout_request_id = v_req.id
  where e.creator_id = v_uid and public.yayinci_kazanc_durumu(e) = 'available';

  insert into public.creator_payout_events (request_id, actor_id, from_status, to_status)
  values (v_req.id, v_uid, null, 'pending');

  return v_req;
end;
$$;

grant execute on function public.yayinci_odeme_talebi_olustur(text) to authenticated;

create or replace function public.yayinci_odeme_talebi_iptal(p_request_id uuid)
returns public.creator_payout_requests
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.creator_payout_requests%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_req from public.creator_payout_requests where id = p_request_id for update;
  if not found or v_req.user_id <> v_uid then raise exception 'Not found'; end if;
  if v_req.status <> 'pending' then raise exception 'cannot_cancel'; end if;

  update public.creator_earning_entries set payout_request_id = null where payout_request_id = v_req.id;
  update public.creator_payout_requests
    set status = 'cancelled', cancelled_at = now(), updated_at = now()
    where id = v_req.id returning * into v_req;
  insert into public.creator_payout_events (request_id, actor_id, from_status, to_status)
  values (v_req.id, v_uid, 'pending', 'cancelled');
  return v_req;
end;
$$;

grant execute on function public.yayinci_odeme_talebi_iptal(uuid) to authenticated;

create or replace function public.yayinci_odeme_taleplerim()
returns setof public.creator_payout_requests
language sql
stable
security definer
set search_path to 'public'
as $$
  select * from public.creator_payout_requests
  where user_id = auth.uid()
  order by created_at desc
  limit 50;
$$;

grant execute on function public.yayinci_odeme_taleplerim() to authenticated;

-- Admin: durum geçişi (yalnızca izin verilen geçişler)
create or replace function public.admin_yayinci_odeme_durum(
  p_request_id uuid,
  p_status text,
  p_note text default null,
  p_fee_usd numeric default null
)
returns public.creator_payout_requests
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.creator_payout_requests%rowtype;
  v_from text;
  v_ok boolean;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;

  select * into v_req from public.creator_payout_requests where id = p_request_id for update;
  if not found then raise exception 'Not found'; end if;
  v_from := v_req.status;

  v_ok := (v_from, p_status) in (
    ('pending', 'under_review'), ('pending', 'on_hold'), ('pending', 'cancelled'),
    ('under_review', 'approved'), ('under_review', 'on_hold'), ('under_review', 'cancelled'),
    ('on_hold', 'under_review'), ('on_hold', 'cancelled'),
    ('approved', 'sent_to_bank'), ('approved', 'cancelled'),
    ('sent_to_bank', 'completed'), ('sent_to_bank', 'failed')
  );
  if not v_ok then
    raise exception 'invalid_transition %->%', v_from, p_status;
  end if;
  if p_status in ('on_hold', 'cancelled', 'failed') and coalesce(trim(p_note), '') = '' then
    raise exception 'note_required';
  end if;

  if p_fee_usd is not null and v_from in ('pending', 'under_review') then
    if p_fee_usd < 0 or p_fee_usd > v_req.amount_usd then raise exception 'invalid_fee'; end if;
    v_req.fee_usd := p_fee_usd;
    v_req.net_usd := v_req.amount_usd - p_fee_usd;
  end if;

  update public.creator_payout_requests set
    status = p_status,
    status_note = coalesce(p_note, status_note),
    failure_reason = case when p_status = 'failed' then p_note else failure_reason end,
    fee_usd = v_req.fee_usd,
    net_usd = v_req.net_usd,
    reviewed_at = case when p_status = 'under_review' and reviewed_at is null then now() else reviewed_at end,
    approved_at = case when p_status = 'approved' then now() else approved_at end,
    sent_at = case when p_status = 'sent_to_bank' then now() else sent_at end,
    completed_at = case when p_status = 'completed' then now() else completed_at end,
    failed_at = case when p_status = 'failed' then now() else failed_at end,
    cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
    updated_at = now()
  where id = p_request_id
  returning * into v_req;

  if p_status in ('failed', 'cancelled') then
    update public.creator_earning_entries set payout_request_id = null where payout_request_id = p_request_id;
  elsif p_status = 'completed' then
    update public.creator_earning_entries set paid_at = now() where payout_request_id = p_request_id;
  end if;

  insert into public.creator_payout_events (request_id, actor_id, from_status, to_status, note)
  values (p_request_id, v_uid, v_from, p_status, p_note);

  perform public.bildirim_kuyruga_ekle(
    v_req.user_id, 'wallet', 'Ödeme talebi güncellendi', 'Ödeme talebinin durumu değişti.',
    '/cuzdan/yayinci-kazanclari',
    jsonb_build_object('type', 'creator_payout_status', 'request_id', p_request_id, 'status', p_status)
  );

  return v_req;
end;
$$;

grant execute on function public.admin_yayinci_odeme_durum(uuid, text, text, numeric) to authenticated;

create or replace function public.admin_yayinci_odeme_listesi(p_status text default null)
returns setof public.creator_payout_requests
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  return query
    select * from public.creator_payout_requests
    where p_status is null or status = p_status
    order by created_at desc
    limit 200;
end;
$$;

grant execute on function public.admin_yayinci_odeme_listesi(text) to authenticated;

-- Admin: güvenlik bayrağı ve kazanç bekletme
create or replace function public.admin_finans_risk_bayragi(
  p_user_id uuid,
  p_kind text,
  p_severity text,
  p_note text
)
returns public.finance_risk_flags
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.finance_risk_flags%rowtype;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'note_required'; end if;
  insert into public.finance_risk_flags (user_id, kind, severity, details)
  values (p_user_id, p_kind, p_severity, jsonb_build_object('note', p_note, 'by', auth.uid()))
  returning * into v_row;

  if p_severity = 'high' then
    update public.creator_earning_entries
      set hold_reason = coalesce(hold_reason, 'security_review')
    where creator_id = p_user_id and payout_request_id is null and paid_at is null and eligible;
  end if;
  return v_row;
end;
$$;

grant execute on function public.admin_finans_risk_bayragi(uuid, text, text, text) to authenticated;

create or replace function public.admin_finans_risk_coz(
  p_flag_id uuid,
  p_status text,
  p_note text,
  p_release_holds boolean default false
)
returns public.finance_risk_flags
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.finance_risk_flags%rowtype;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  if p_status not in ('cleared', 'confirmed') then raise exception 'invalid_status'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'note_required'; end if;

  update public.finance_risk_flags
    set status = p_status, resolved_by = auth.uid(), resolved_at = now(), resolution_note = p_note
    where id = p_flag_id and status = 'open'
    returning * into v_row;
  if not found then raise exception 'Not found'; end if;

  if p_status = 'cleared' and p_release_holds then
    if v_row.ref_type = 'creator_earning' and v_row.ref_id is not null then
      update public.creator_earning_entries set hold_reason = null where id = v_row.ref_id and paid_at is null;
    elsif not exists (
      select 1 from public.finance_risk_flags
      where user_id = v_row.user_id and status = 'open' and severity = 'high'
    ) then
      update public.creator_earning_entries
        set hold_reason = null
      where creator_id = v_row.user_id and hold_reason = 'security_review' and paid_at is null;
    end if;
  end if;

  return v_row;
end;
$$;

grant execute on function public.admin_finans_risk_coz(uuid, text, text, boolean) to authenticated;
