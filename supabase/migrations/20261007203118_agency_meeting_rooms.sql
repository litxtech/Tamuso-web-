-- Ajans görüşme / toplantı odaları.
-- Mevcut agencies, agency RBAC, user_notifications, LiveKit ve user_blocks korunur.
-- Ses odası (rooms) ve 1:1 arama (direct_calls) tablolarına dokunulmaz.
-- Video/ses kaydı yok; yalnız toplantı metadatası.

insert into public.feature_flags (key, enabled, description)
values ('agency_meetings_enabled', true, 'Ajans görüşme ve toplantı odaları')
on conflict (key) do nothing;

insert into public.kill_switches (key, active, reason)
values ('kill_agency_meetings', false, null)
on conflict (key) do nothing;

insert into public.agency_permissions (code, description, sort_order) values
  ('agency.view_meetings', 'Ajans görüşmelerini gör', 210),
  ('agency.manage_meetings', 'Görüşme ve oda yönet', 220),
  ('agency.recruit_meetings', 'Yayıncı görüşmesi oluştur', 230),
  ('agency.invite_official', 'Tamuso Official davet et', 240)
on conflict (code) do nothing;

insert into public.agency_role_templates (role_code, name, is_system, sort_order)
values ('RECRUITER', 'Recruiter', true, 6)
on conflict (role_code) do nothing;

insert into public.agency_role_default_permissions (role_code, permission_code)
select 'OWNER', p.code
from public.agency_permissions p
where p.code in (
  'agency.view_meetings',
  'agency.manage_meetings',
  'agency.recruit_meetings',
  'agency.invite_official'
)
on conflict do nothing;

insert into public.agency_role_default_permissions (role_code, permission_code)
select 'MANAGER', x
from unnest(array[
  'agency.view_meetings',
  'agency.manage_meetings',
  'agency.recruit_meetings',
  'agency.invite_official'
]) as x
on conflict do nothing;

insert into public.agency_role_default_permissions (role_code, permission_code)
select 'MODERATOR', x
from unnest(array['agency.view_meetings', 'agency.manage_meetings']) as x
on conflict do nothing;

insert into public.agency_role_default_permissions (role_code, permission_code)
select 'HOST_MANAGER', x
from unnest(array['agency.view_meetings', 'agency.recruit_meetings']) as x
on conflict do nothing;

insert into public.agency_role_default_permissions (role_code, permission_code)
select 'RECRUITER', x
from unnest(array['agency.view_meetings', 'agency.recruit_meetings']) as x
on conflict do nothing;

insert into public.agency_role_default_permissions (role_code, permission_code)
select 'MEMBER', x
from unnest(array['agency.view_meetings']) as x
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Tablolar
-- ---------------------------------------------------------------------------
create table if not exists public.agency_meetings (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  title text not null,
  description text not null default '',
  room_type text not null,
  media_type text not null default 'audio_video',
  visibility text not null default 'invited',
  status text not null default 'scheduled',
  scheduled_at timestamptz,
  duration_minutes int not null default 30,
  started_at timestamptz,
  ended_at timestamptz,
  ended_by uuid references public.profiles(id),
  max_participants int not null default 12,
  locked_at timestamptz,
  livekit_room_name text not null,
  invite_token text not null,
  moderation_reason text,
  force_ended_by uuid references public.profiles(id),
  recruitment_outcome text,
  rescheduled_from uuid,
  is_paid boolean not null default false,
  price_per_minute numeric(12, 2),
  billing_mode text not null default 'free',
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agency_meetings_title_len check (char_length(title) between 2 and 80),
  constraint agency_meetings_desc_len check (char_length(description) <= 2000),
  constraint agency_meetings_room_type_chk check (room_type in (
    'private_meeting', 'creator_interview', 'group_meeting', 'agency_meeting',
    'announcement_room', 'platform_meeting', 'custom'
  )),
  constraint agency_meetings_media_chk check (media_type in ('audio', 'video', 'audio_video')),
  constraint agency_meetings_visibility_chk check (visibility in (
    'private', 'agency_members', 'invited', 'link'
  )),
  constraint agency_meetings_status_chk check (status in (
    'draft', 'scheduled', 'waiting', 'live', 'ended', 'cancelled'
  )),
  constraint agency_meetings_capacity_chk check (max_participants between 2 and 50),
  constraint agency_meetings_duration_chk check (duration_minutes between 5 and 240),
  constraint agency_meetings_billing_chk check (billing_mode in ('free', 'per_minute')),
  constraint agency_meetings_outcome_chk check (
    recruitment_outcome is null or recruitment_outcome in (
      'evaluating', 'accepted', 'rejected', 'follow_up'
    )
  ),
  constraint agency_meetings_platform_agency_chk check (
    agency_id is not null or room_type = 'platform_meeting'
  )
);

create unique index if not exists agency_meetings_livekit_uidx
  on public.agency_meetings (livekit_room_name);
create unique index if not exists agency_meetings_token_uidx
  on public.agency_meetings (invite_token);
create index if not exists agency_meetings_agency_sched_idx
  on public.agency_meetings (agency_id, scheduled_at desc)
  where deleted_at is null;
create index if not exists agency_meetings_status_idx
  on public.agency_meetings (status, scheduled_at)
  where deleted_at is null;

create table if not exists public.agency_meeting_participants (
  meeting_id uuid not null references public.agency_meetings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'listener',
  status text not null default 'invited',
  joined_at timestamptz,
  left_at timestamptz,
  can_speak boolean not null default false,
  can_video boolean not null default false,
  can_chat boolean not null default true,
  hand_raised_at timestamptz,
  muted_by_host boolean not null default false,
  video_off_by_host boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (meeting_id, user_id),
  constraint agency_meeting_participants_role_chk check (role in (
    'host', 'co_host', 'speaker', 'listener', 'platform'
  )),
  constraint agency_meeting_participants_status_chk check (status in (
    'invited', 'joined', 'left', 'removed', 'blocked'
  ))
);

create index if not exists agency_meeting_participants_user_idx
  on public.agency_meeting_participants (user_id, status);

create table if not exists public.agency_meeting_invitations (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.agency_meetings(id) on delete cascade,
  invited_by uuid not null references public.profiles(id),
  invitee_user_id uuid not null references public.profiles(id),
  status text not null default 'pending',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (meeting_id, invitee_user_id),
  constraint agency_meeting_invitations_status_chk check (status in (
    'pending', 'accepted', 'declined', 'expired', 'cancelled'
  ))
);

create index if not exists agency_meeting_invitations_invitee_idx
  on public.agency_meeting_invitations (invitee_user_id, status, created_at desc);

create table if not exists public.agency_meeting_messages (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.agency_meetings(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  kind text not null default 'text',
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint agency_meeting_messages_kind_chk check (kind in ('text', 'emoji', 'system')),
  constraint agency_meeting_messages_body_len check (char_length(body) between 1 and 500)
);

create index if not exists agency_meeting_messages_meeting_idx
  on public.agency_meeting_messages (meeting_id, created_at desc);

create table if not exists public.agency_meeting_events (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.agency_meetings(id) on delete cascade,
  agency_id uuid references public.agencies(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agency_meeting_events_meeting_idx
  on public.agency_meeting_events (meeting_id, created_at desc);

create table if not exists public.agency_meeting_notice_log (
  meeting_id uuid not null references public.agency_meetings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now(),
  primary key (meeting_id, user_id, kind)
);

-- ---------------------------------------------------------------------------
-- Yardımcılar (istemciye açık değil)
-- ---------------------------------------------------------------------------
create or replace function public.agency_meeting_acik_mi()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.kill_switch_aktif_mi('kill_agency_meetings')
     or not public.ozellik_bayragi_aktif_mi('agency_meetings_enabled') then
    raise exception 'DISABLED';
  end if;
end;
$$;

create or replace function public.agency_meeting_resmi_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.is_platform_official = true
    and coalesce(p.is_platform_yargic, false) = false
    and p.deleted_at is null
    and p.banned_at is null
  order by p.created_at asc
  limit 1;
$$;

create or replace function public.agency_meeting_olay_yaz(
  p_meeting_id uuid,
  p_action text,
  p_target uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency uuid;
begin
  select agency_id into v_agency from public.agency_meetings where id = p_meeting_id;
  insert into public.agency_meeting_events (
    meeting_id, agency_id, actor_id, action, target_user_id, details
  ) values (
    p_meeting_id, v_agency, auth.uid(), p_action, p_target, coalesce(p_details, '{}'::jsonb)
  );
  if v_agency is not null then
    perform public.agency_audit_yaz(
      v_agency,
      'meeting_' || p_action,
      left(p_action, 180),
      p_target,
      coalesce(p_details, '{}'::jsonb) || jsonb_build_object('meeting_id', p_meeting_id)
    );
  end if;
end;
$$;

create or replace function public.agency_meeting_bildir(
  p_meeting_id uuid,
  p_user_id uuid,
  p_kind text,
  p_title text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ins uuid;
begin
  if p_user_id is null or p_user_id = auth.uid() and p_kind = 'invite' then
    return;
  end if;
  insert into public.agency_meeting_notice_log (meeting_id, user_id, kind)
  values (p_meeting_id, p_user_id, p_kind)
  on conflict do nothing
  returning meeting_id into v_ins;
  if v_ins is null then
    return;
  end if;
  perform public.bildirim_kuyruga_ekle(
    p_user_id,
    'agency',
    p_title,
    p_body,
    '/ajans/gorusme/' || p_meeting_id::text,
    jsonb_build_object(
      'type', 'agency_meeting_' || p_kind,
      'meeting_id', p_meeting_id,
      'agency_id', (select agency_id from public.agency_meetings where id = p_meeting_id)
    )
  );
end;
$$;

create or replace function public.agency_meeting_sistem(
  p_meeting_id uuid,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.agency_meeting_messages (meeting_id, sender_id, kind, body)
  values (p_meeting_id, null, 'system', left(trim(p_body), 500));
end;
$$;

create or replace function public.agency_meeting_uye_mi(p_agency_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.agencies a
    where a.id = p_agency_id and a.owner_id = p_user_id
  ) or exists (
    select 1 from public.agency_staff_roles s
    where s.agency_id = p_agency_id and s.user_id = p_user_id
  ) or exists (
    select 1 from public.host_profiles hp
    where hp.agency_id = p_agency_id
      and hp.user_id = p_user_id
      and hp.status = 'agency'
  );
$$;

create or replace function public.agency_meeting_gorebilir(p_meeting_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_m public.agency_meetings%rowtype;
begin
  if v_uid is null then return false; end if;
  select * into v_m from public.agency_meetings where id = p_meeting_id and deleted_at is null;
  if not found then return false; end if;
  if public.ben_admin_miyim() then return true; end if;
  if v_m.created_by = v_uid then return true; end if;
  if v_uid = public.agency_meeting_resmi_id() and (
    exists (
      select 1 from public.agency_meeting_invitations i
      where i.meeting_id = v_m.id and i.invitee_user_id = v_uid
    )
    or exists (
      select 1 from public.agency_meeting_participants p
      where p.meeting_id = v_m.id and p.user_id = v_uid
    )
  ) then
    return true;
  end if;
  if exists (
    select 1 from public.agency_meeting_participants p
    where p.meeting_id = v_m.id and p.user_id = v_uid and p.status <> 'blocked'
  ) then
    return true;
  end if;
  if exists (
    select 1 from public.agency_meeting_invitations i
    where i.meeting_id = v_m.id and i.invitee_user_id = v_uid
  ) then
    return true;
  end if;
  if v_m.agency_id is not null
     and public.agency_meeting_uye_mi(v_m.agency_id, v_uid)
     and public.agency_has_permission(v_m.agency_id, 'agency.view_meetings')
     and v_m.visibility in ('agency_members', 'invited', 'link') then
    return true;
  end if;
  if v_m.agency_id is not null
     and public.agency_has_permission(v_m.agency_id, 'agency.manage_meetings') then
    return true;
  end if;
  return false;
end;
$$;

create or replace function public.agency_meeting_canli_rol(p_meeting_id uuid, p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.agency_meeting_participants p
  where p.meeting_id = p_meeting_id
    and p.user_id = p_user_id
    and p.status = 'joined';
$$;

create or replace function public.agency_meeting_yonetici_mi(p_meeting_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_agency uuid;
begin
  if v_uid is null then return false; end if;
  if public.ben_admin_miyim() then return true; end if;
  v_role := public.agency_meeting_canli_rol(p_meeting_id, v_uid);
  if v_role in ('host', 'co_host') then return true; end if;
  select agency_id into v_agency from public.agency_meetings where id = p_meeting_id;
  if v_agency is not null
     and public.agency_has_permission(v_agency, 'agency.manage_meetings') then
    return true;
  end if;
  return false;
end;
$$;

create or replace function public.agency_meeting_kisi_uygun_mu(p_user_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_birth date;
  v_guest boolean;
begin
  if not public.hesap_aktif_mi(p_user_id) then
    raise exception 'BANNED';
  end if;
  select birth_date, coalesce(is_guest, false)
    into v_birth, v_guest
  from public.profiles
  where id = p_user_id;
  if coalesce(v_guest, false) then
    raise exception 'ACCESS_DENIED';
  end if;
  if v_birth is not null and v_birth > (current_date - interval '18 years') then
    raise exception 'AGE';
  end if;
end;
$$;

create or replace function public.agency_meeting_engel_var_mi(p_meeting_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agency_meeting_participants part
    where part.meeting_id = p_meeting_id
      and part.user_id <> p_user_id
      and part.status in ('joined', 'invited')
      and public.kullanicilar_engelli_mi(p_user_id, part.user_id)
  ) or exists (
    select 1
    from public.agency_meetings m
    where m.id = p_meeting_id
      and public.kullanicilar_engelli_mi(p_user_id, m.created_by)
  );
$$;

-- ---------------------------------------------------------------------------
-- Okuma
-- ---------------------------------------------------------------------------
create or replace function public.agency_meeting_ben_resmi_miyim()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    public.ben_admin_miyim()
    or auth.uid() = public.agency_meeting_resmi_id()
  );
$$;

create or replace function public.agency_meeting_ozet(p_agency_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'ACCESS_DENIED'; end if;
  perform public.agency_meeting_acik_mi();
  if not public.agency_has_permission(p_agency_id, 'agency.view_meetings')
     and not public.agency_meeting_uye_mi(p_agency_id, v_uid)
     and not public.ben_admin_miyim() then
    raise exception 'ACCESS_DENIED';
  end if;
  return jsonb_build_object(
    'today', (
      select count(*) from public.agency_meetings m
      where m.agency_id = p_agency_id and m.deleted_at is null
        and m.status in ('scheduled', 'waiting', 'live')
        and m.scheduled_at::date = (now() at time zone 'utc')::date
        and public.agency_meeting_gorebilir(m.id)
    ),
    'live', (
      select count(*) from public.agency_meetings m
      where m.agency_id = p_agency_id and m.deleted_at is null
        and m.status = 'live' and public.agency_meeting_gorebilir(m.id)
    ),
    'pending_invites', (
      select count(*) from public.agency_meeting_invitations i
      join public.agency_meetings m on m.id = i.meeting_id
      where m.agency_id = p_agency_id and m.deleted_at is null
        and i.status = 'pending'
        and (
          public.agency_has_permission(p_agency_id, 'agency.manage_meetings')
          or i.invitee_user_id = v_uid
        )
    ),
    'upcoming', (
      select count(*) from public.agency_meetings m
      where m.agency_id = p_agency_id and m.deleted_at is null
        and m.status in ('scheduled', 'waiting')
        and public.agency_meeting_gorebilir(m.id)
    )
  );
end;
$$;

create or replace function public.agency_meeting_liste(
  p_agency_id uuid,
  p_bucket text default 'upcoming',
  p_before timestamptz default null,
  p_limit int default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lim int := least(greatest(coalesce(p_limit, 20), 1), 50);
begin
  if auth.uid() is null then raise exception 'ACCESS_DENIED'; end if;
  perform public.agency_meeting_acik_mi();
  if not public.agency_has_permission(p_agency_id, 'agency.view_meetings')
     and not public.ben_admin_miyim() then
    raise exception 'ACCESS_DENIED';
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(x) order by x.scheduled_at desc nulls last)
    from (
      select
        m.id, m.title, m.room_type, m.media_type, m.visibility, m.status,
        m.scheduled_at, m.started_at, m.ended_at, m.duration_minutes,
        m.max_participants, m.locked_at, m.recruitment_outcome,
        a.name as agency_name, a.is_verified,
        (
          select count(*) from public.agency_meeting_participants p
          where p.meeting_id = m.id and p.status = 'joined'
        ) as participant_count
      from public.agency_meetings m
      left join public.agencies a on a.id = m.agency_id
      where m.agency_id = p_agency_id
        and m.deleted_at is null
        and public.agency_meeting_gorebilir(m.id)
        and (p_before is null or m.created_at < p_before)
        and (
          (p_bucket = 'live' and m.status = 'live')
          or (p_bucket = 'upcoming' and m.status in ('scheduled', 'waiting'))
          or (p_bucket = 'past' and m.status in ('ended', 'cancelled'))
          or (p_bucket = 'today' and m.scheduled_at::date = (now() at time zone 'utc')::date)
          or (p_bucket = 'all')
        )
      order by coalesce(m.scheduled_at, m.created_at) desc
      limit v_lim
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.agency_meeting_detay(p_meeting_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_m public.agency_meetings%rowtype;
  v_agency_name text;
  v_verified boolean;
  v_logo text;
begin
  if auth.uid() is null then raise exception 'ACCESS_DENIED'; end if;
  perform public.agency_meeting_acik_mi();
  if not public.agency_meeting_gorebilir(p_meeting_id) then
    raise exception 'ACCESS_DENIED';
  end if;
  select * into v_m from public.agency_meetings where id = p_meeting_id;
  select name, is_verified, logo_url into v_agency_name, v_verified, v_logo
  from public.agencies where id = v_m.agency_id;
  return jsonb_build_object(
    'id', v_m.id,
    'agency_id', v_m.agency_id,
    'agency_name', v_agency_name,
    'agency_verified', coalesce(v_verified, false),
    'agency_logo', v_logo,
    'title', v_m.title,
    'description', v_m.description,
    'room_type', v_m.room_type,
    'media_type', v_m.media_type,
    'visibility', v_m.visibility,
    'status', v_m.status,
    'scheduled_at', v_m.scheduled_at,
    'duration_minutes', v_m.duration_minutes,
    'started_at', v_m.started_at,
    'ended_at', v_m.ended_at,
    'max_participants', v_m.max_participants,
    'locked', v_m.locked_at is not null,
    'livekit_room_name', v_m.livekit_room_name,
    'invite_token', case when v_m.visibility = 'link'
      and public.agency_meeting_yonetici_mi(v_m.id) then v_m.invite_token else null end,
    'recruitment_outcome', v_m.recruitment_outcome,
    'moderation_reason', case when public.ben_admin_miyim() then v_m.moderation_reason else null end,
    'my_role', public.agency_meeting_canli_rol(v_m.id, auth.uid()),
    'can_manage', public.agency_meeting_yonetici_mi(v_m.id),
    'participant_count', (
      select count(*) from public.agency_meeting_participants p
      where p.meeting_id = v_m.id and p.status = 'joined'
    )
  );
end;
$$;

create or replace function public.agency_meeting_katilimcilar(p_meeting_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.agency_meeting_gorebilir(p_meeting_id) then
    raise exception 'ACCESS_DENIED';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', p.user_id,
      'role', p.role,
      'status', p.status,
      'can_speak', p.can_speak,
      'can_video', p.can_video,
      'hand_raised', p.hand_raised_at is not null,
      'display_name', pr.display_name,
      'username', pr.username,
      'avatar_url', pr.avatar_url,
      'is_platform_official', coalesce(pr.is_platform_official, false)
        and not coalesce(pr.is_platform_yargic, false)
    ) order by
      case p.role
        when 'host' then 1 when 'co_host' then 2 when 'platform' then 3
        when 'speaker' then 4 else 5 end,
      pr.display_name
    )
    from public.agency_meeting_participants p
    join public.profiles pr on pr.id = p.user_id
    where p.meeting_id = p_meeting_id
      and p.status in ('joined', 'invited')
  ), '[]'::jsonb);
end;
$$;

create or replace function public.agency_meeting_mesajlar(
  p_meeting_id uuid,
  p_before timestamptz default null,
  p_limit int default 40
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lim int := least(greatest(coalesce(p_limit, 40), 1), 80);
begin
  if not public.agency_meeting_gorebilir(p_meeting_id) then
    raise exception 'ACCESS_DENIED';
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(x) order by x.created_at)
    from (
      select msg.id, msg.sender_id, msg.kind, msg.body, msg.created_at,
        pr.display_name
      from public.agency_meeting_messages msg
      left join public.profiles pr on pr.id = msg.sender_id
      where msg.meeting_id = p_meeting_id
        and msg.deleted_at is null
        and (p_before is null or msg.created_at < p_before)
      order by msg.created_at desc
      limit v_lim
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.agency_meeting_davetlerim(p_limit int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lim int := least(greatest(coalesce(p_limit, 30), 1), 50);
begin
  if auth.uid() is null then raise exception 'ACCESS_DENIED'; end if;
  perform public.agency_meeting_acik_mi();
  return coalesce((
    select jsonb_agg(row_to_json(x) order by x.created_at desc)
    from (
      select
        i.id as invitation_id, i.status, i.expires_at, i.created_at,
        m.id as meeting_id, m.title, m.room_type, m.status as meeting_status,
        m.scheduled_at, m.duration_minutes, m.media_type,
        a.name as agency_name, a.is_verified
      from public.agency_meeting_invitations i
      join public.agency_meetings m on m.id = i.meeting_id and m.deleted_at is null
      left join public.agencies a on a.id = m.agency_id
      where i.invitee_user_id = auth.uid()
        and i.status in ('pending', 'accepted')
        and m.status not in ('ended', 'cancelled')
      order by i.created_at desc
      limit v_lim
    ) x
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- Yazma
-- ---------------------------------------------------------------------------
create or replace function public.agency_meeting_olustur(
  p_agency_id uuid,
  p_title text,
  p_description text default '',
  p_room_type text default 'private_meeting',
  p_media_type text default 'audio_video',
  p_visibility text default 'invited',
  p_scheduled_at timestamptz default null,
  p_duration_minutes int default 30,
  p_max_participants int default 12,
  p_invite_usernames text[] default '{}',
  p_invite_official boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_title text := left(trim(coalesce(p_title, '')), 80);
  v_agency public.agencies%rowtype;
  v_status text;
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_room text := 'am-' || v_id::text;
  v_name text;
  v_user uuid;
  v_official uuid;
  v_expires timestamptz;
begin
  if v_uid is null then raise exception 'ACCESS_DENIED'; end if;
  perform public.agency_meeting_acik_mi();
  perform public.agency_meeting_kisi_uygun_mu(v_uid);
  if char_length(v_title) < 2 then raise exception 'TITLE'; end if;

  if p_agency_id is null then
    if p_room_type <> 'platform_meeting' or not public.agency_meeting_ben_resmi_miyim() then
      raise exception 'ACCESS_DENIED';
    end if;
  else
    select * into v_agency from public.agencies where id = p_agency_id and status = 'active';
    if not found then raise exception 'NOT_FOUND'; end if;
    -- Sahip, kendi aktif ajansında doğrulama rozeti olmasa da oda açabilir.
    -- Doğrulama kapısı yalnız sahip olmayan personel içindir.
    if not coalesce(v_agency.is_verified, false)
       and v_agency.owner_id is distinct from v_uid
       and not public.ben_admin_miyim() then
      raise exception 'NOT_VERIFIED';
    end if;
    if p_room_type = 'creator_interview' then
      if not (
        public.agency_has_permission(p_agency_id, 'agency.manage_meetings')
        or public.agency_has_permission(p_agency_id, 'agency.recruit_meetings')
      ) then
        raise exception 'ACCESS_DENIED';
      end if;
    elsif p_room_type = 'platform_meeting' then
      if not public.agency_meeting_ben_resmi_miyim()
         and not public.agency_has_permission(p_agency_id, 'agency.invite_official') then
        raise exception 'ACCESS_DENIED';
      end if;
    else
      if not public.agency_has_permission(p_agency_id, 'agency.manage_meetings') then
        raise exception 'ACCESS_DENIED';
      end if;
    end if;
  end if;

  if p_invite_official and (
    p_agency_id is null
    or not public.agency_has_permission(p_agency_id, 'agency.invite_official')
  ) and not public.agency_meeting_ben_resmi_miyim() then
    raise exception 'ACCESS_DENIED';
  end if;

  v_status := case when p_scheduled_at is null then 'waiting' else 'scheduled' end;
  v_expires := coalesce(p_scheduled_at, now()) + make_interval(mins => greatest(p_duration_minutes, 30));

  insert into public.agency_meetings (
    id, agency_id, created_by, title, description, room_type, media_type,
    visibility, status, scheduled_at, duration_minutes, max_participants,
    livekit_room_name, invite_token, is_paid, billing_mode
  ) values (
    v_id, p_agency_id, v_uid, v_title, left(coalesce(p_description, ''), 2000),
    p_room_type, p_media_type, p_visibility, v_status, p_scheduled_at,
    p_duration_minutes, least(greatest(p_max_participants, 2), 50),
    v_room, v_token, false, 'free'
  );

  insert into public.agency_meeting_participants (
    meeting_id, user_id, role, status, can_speak, can_video, joined_at
  ) values (
    v_id, v_uid,
    case when v_uid = public.agency_meeting_resmi_id() then 'platform' else 'host' end,
    'joined', true, true, now()
  );

  perform public.agency_meeting_sistem(v_id, 'meeting_created');
  perform public.agency_meeting_olay_yaz(v_id, 'created', null, jsonb_build_object(
    'room_type', p_room_type, 'status', v_status
  ));

  if p_invite_usernames is not null then
    foreach v_name in array p_invite_usernames loop
      v_name := lower(trim(v_name));
      if v_name = '' then continue; end if;
      select id into v_user from public.profiles
      where lower(username) = v_name and deleted_at is null
      limit 1;
      if v_user is null or v_user = v_uid then continue; end if;
      if public.kullanicilar_engelli_mi(v_uid, v_user) then continue; end if;
      insert into public.agency_meeting_invitations (
        meeting_id, invited_by, invitee_user_id, status, expires_at
      ) values (v_id, v_uid, v_user, 'pending', v_expires)
      on conflict (meeting_id, invitee_user_id) do nothing;
      insert into public.agency_meeting_participants (
        meeting_id, user_id, role, status, can_speak, can_video
      ) values (v_id, v_user, 'listener', 'invited', false, false)
      on conflict (meeting_id, user_id) do nothing;
      perform public.agency_meeting_bildir(
        v_id, v_user, 'invite',
        coalesce(v_agency.name, 'Tamuso'),
        v_title
      );
      perform public.agency_meeting_olay_yaz(v_id, 'invited', v_user, '{}'::jsonb);
    end loop;
  end if;

  if p_invite_official then
    v_official := public.agency_meeting_resmi_id();
    if v_official is null then
      raise exception 'PLATFORM_ACCOUNT_MISSING';
    end if;
    if v_official <> v_uid and not public.kullanicilar_engelli_mi(v_uid, v_official) then
      insert into public.agency_meeting_invitations (
        meeting_id, invited_by, invitee_user_id, status, expires_at
      ) values (v_id, v_uid, v_official, 'pending', v_expires)
      on conflict (meeting_id, invitee_user_id) do nothing;
      insert into public.agency_meeting_participants (
        meeting_id, user_id, role, status, can_speak, can_video
      ) values (v_id, v_official, 'platform', 'invited', true, true)
      on conflict (meeting_id, user_id) do nothing;
      perform public.agency_meeting_bildir(
        v_id, v_official, 'official_invite',
        coalesce(v_agency.name, 'Tamuso'),
        v_title
      );
    end if;
  end if;

  return public.agency_meeting_detay(v_id);
end;
$$;

create or replace function public.agency_meeting_davet_yanit(
  p_invitation_id uuid,
  p_accept boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.agency_meeting_invitations%rowtype;
begin
  if v_uid is null then raise exception 'ACCESS_DENIED'; end if;
  perform public.agency_meeting_acik_mi();
  select * into v_inv from public.agency_meeting_invitations
  where id = p_invitation_id and invitee_user_id = v_uid
  for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_inv.status <> 'pending' then raise exception 'STATE'; end if;
  if v_inv.expires_at is not null and v_inv.expires_at < now() then
    update public.agency_meeting_invitations set status = 'expired', responded_at = now()
    where id = v_inv.id;
    raise exception 'INVITE_EXPIRED';
  end if;
  update public.agency_meeting_invitations set
    status = case when p_accept then 'accepted' else 'declined' end,
    responded_at = now()
  where id = v_inv.id;
  perform public.agency_meeting_olay_yaz(
    v_inv.meeting_id,
    case when p_accept then 'invite_accepted' else 'invite_declined' end,
    v_uid,
    '{}'::jsonb
  );
  return public.agency_meeting_detay(v_inv.meeting_id);
end;
$$;

create or replace function public.agency_meeting_katil(
  p_meeting_id uuid,
  p_invite_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_m public.agency_meetings%rowtype;
  v_part public.agency_meeting_participants%rowtype;
  v_count int;
  v_allowed boolean := false;
  v_role text := 'listener';
  v_speak boolean := false;
  v_video boolean := false;
begin
  if v_uid is null then raise exception 'ACCESS_DENIED'; end if;
  perform public.agency_meeting_acik_mi();
  perform public.agency_meeting_kisi_uygun_mu(v_uid);

  select * into v_m from public.agency_meetings where id = p_meeting_id and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_m.status in ('ended', 'cancelled') then raise exception 'ENDED'; end if;
  if v_m.status = 'draft' then raise exception 'STATE'; end if;

  select * into v_part from public.agency_meeting_participants
  where meeting_id = v_m.id and user_id = v_uid;
  if found and v_part.status in ('removed', 'blocked') then
    raise exception 'ACCESS_DENIED';
  end if;

  if v_m.locked_at is not null and (not found or v_part.status <> 'joined') then
    raise exception 'LOCKED';
  end if;

  if public.agency_meeting_engel_var_mi(v_m.id, v_uid) then
    raise exception 'BLOCKED';
  end if;

  if found and v_part.role in ('host', 'co_host', 'platform') then
    v_allowed := true;
    v_role := v_part.role;
    v_speak := true;
    v_video := v_m.media_type <> 'audio';
  elsif found and v_part.status = 'joined' then
    v_allowed := true;
    v_role := v_part.role;
    v_speak := v_part.can_speak and not v_part.muted_by_host;
    v_video := v_part.can_video and not v_part.video_off_by_host and v_m.media_type <> 'audio';
  end if;

  if not v_allowed and v_m.created_by = v_uid then
    v_allowed := true;
    v_role := 'host';
    v_speak := true;
    v_video := v_m.media_type <> 'audio';
  end if;

  if not v_allowed and exists (
    select 1 from public.agency_meeting_invitations i
    where i.meeting_id = v_m.id and i.invitee_user_id = v_uid and i.status = 'accepted'
  ) then
    v_allowed := true;
  end if;

  if not v_allowed and exists (
    select 1 from public.agency_meeting_invitations i
    where i.meeting_id = v_m.id and i.invitee_user_id = v_uid and i.status = 'pending'
      and (i.expires_at is null or i.expires_at >= now())
  ) then
    update public.agency_meeting_invitations set status = 'accepted', responded_at = now()
    where meeting_id = v_m.id and invitee_user_id = v_uid and status = 'pending';
    v_allowed := true;
  end if;

  if not v_allowed
     and v_m.visibility = 'agency_members'
     and v_m.agency_id is not null
     and public.agency_meeting_uye_mi(v_m.agency_id, v_uid) then
    v_allowed := true;
  end if;

  if not v_allowed
     and v_m.visibility = 'link'
     and p_invite_token is not null
     and p_invite_token = v_m.invite_token then
    v_allowed := true;
  end if;

  if not v_allowed
     and v_m.agency_id is not null
     and public.agency_has_permission(v_m.agency_id, 'agency.manage_meetings') then
    v_allowed := true;
    v_role := 'co_host';
    v_speak := true;
    v_video := v_m.media_type <> 'audio';
  end if;

  if not v_allowed then raise exception 'ACCESS_DENIED'; end if;

  if v_uid = public.agency_meeting_resmi_id() and v_role = 'listener' then
    v_role := 'platform';
    v_speak := true;
    v_video := v_m.media_type <> 'audio';
  end if;

  select count(*) into v_count
  from public.agency_meeting_participants
  where meeting_id = v_m.id and status = 'joined' and user_id <> v_uid;
  if v_count >= v_m.max_participants then
    raise exception 'CAPACITY';
  end if;

  if v_m.status = 'scheduled'
     and v_role not in ('host', 'co_host', 'platform')
     and (v_m.scheduled_at is null or v_m.scheduled_at > now() + interval '10 minutes') then
    raise exception 'NOT_STARTED';
  end if;

  insert into public.agency_meeting_participants (
    meeting_id, user_id, role, status, can_speak, can_video, joined_at, left_at, updated_at
  ) values (
    v_m.id, v_uid, v_role, 'joined', v_speak, v_video, now(), null, now()
  )
  on conflict (meeting_id, user_id) do update set
    role = case
      when agency_meeting_participants.role in ('host', 'co_host', 'platform', 'speaker')
        then agency_meeting_participants.role
      else excluded.role
    end,
    status = 'joined',
    can_speak = case
      when agency_meeting_participants.muted_by_host then false
      when agency_meeting_participants.role in ('host', 'co_host', 'platform', 'speaker') then true
      else excluded.can_speak
    end,
    can_video = case
      when agency_meeting_participants.video_off_by_host then false
      when agency_meeting_participants.role in ('host', 'co_host', 'platform', 'speaker')
        then v_m.media_type <> 'audio'
      else excluded.can_video
    end,
    joined_at = coalesce(agency_meeting_participants.joined_at, now()),
    left_at = null,
    updated_at = now();

  if v_role in ('host', 'co_host', 'platform')
     and v_m.status in ('scheduled', 'waiting')
     and (v_m.scheduled_at is null or v_m.scheduled_at <= now() + interval '10 minutes') then
    update public.agency_meetings set
      status = 'live',
      started_at = coalesce(started_at, now()),
      updated_at = now()
    where id = v_m.id and status in ('scheduled', 'waiting');
    perform public.agency_meeting_sistem(v_m.id, 'meeting_started');
    perform public.agency_meeting_olay_yaz(v_m.id, 'started', v_uid, '{}'::jsonb);
  end if;

  perform public.agency_meeting_sistem(v_m.id, 'participant_joined');
  perform public.agency_meeting_olay_yaz(v_m.id, 'joined', v_uid, '{}'::jsonb);
  return public.agency_meeting_detay(v_m.id);
end;
$$;

create or replace function public.agency_meeting_ayril(p_meeting_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'ACCESS_DENIED'; end if;
  update public.agency_meeting_participants set
    status = 'left',
    left_at = now(),
    hand_raised_at = null,
    updated_at = now()
  where meeting_id = p_meeting_id and user_id = auth.uid() and status = 'joined';
  perform public.agency_meeting_olay_yaz(p_meeting_id, 'left', auth.uid(), '{}'::jsonb);
end;
$$;

create or replace function public.agency_meeting_bitir(p_meeting_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.agency_meetings%rowtype;
  v_user uuid;
begin
  if not public.agency_meeting_yonetici_mi(p_meeting_id) then
    raise exception 'ACCESS_DENIED';
  end if;
  select * into v_m from public.agency_meetings where id = p_meeting_id and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_m.status in ('ended', 'cancelled') then raise exception 'STATE'; end if;
  update public.agency_meetings set
    status = 'ended',
    ended_at = now(),
    ended_by = auth.uid(),
    locked_at = null,
    updated_at = now()
  where id = v_m.id;
  update public.agency_meeting_participants set
    status = case when status = 'joined' then 'left' else status end,
    left_at = case when status = 'joined' then now() else left_at end,
    updated_at = now()
  where meeting_id = v_m.id and status = 'joined';
  perform public.agency_meeting_sistem(v_m.id, 'meeting_ended');
  perform public.agency_meeting_olay_yaz(v_m.id, 'ended', auth.uid(), '{}'::jsonb);
  for v_user in
    select user_id from public.agency_meeting_participants where meeting_id = v_m.id
  loop
    perform public.agency_meeting_bildir(v_m.id, v_user, 'ended', v_m.title, 'ended');
  end loop;
  return public.agency_meeting_detay(v_m.id);
end;
$$;

create or replace function public.agency_meeting_iptal(p_meeting_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.agency_meetings%rowtype;
  v_user uuid;
begin
  if not public.agency_meeting_yonetici_mi(p_meeting_id) then raise exception 'ACCESS_DENIED'; end if;
  select * into v_m from public.agency_meetings where id = p_meeting_id and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_m.status in ('ended', 'cancelled') then raise exception 'STATE'; end if;
  update public.agency_meetings set status = 'cancelled', ended_at = now(), ended_by = auth.uid(), updated_at = now()
  where id = v_m.id;
  update public.agency_meeting_invitations set status = 'cancelled', responded_at = now()
  where meeting_id = v_m.id and status = 'pending';
  perform public.agency_meeting_olay_yaz(v_m.id, 'cancelled', auth.uid(), '{}'::jsonb);
  for v_user in
    select invitee_user_id from public.agency_meeting_invitations where meeting_id = v_m.id
  loop
    perform public.agency_meeting_bildir(v_m.id, v_user, 'cancelled', v_m.title, 'cancelled');
  end loop;
  return public.agency_meeting_detay(v_m.id);
end;
$$;

create or replace function public.agency_meeting_yeniden_planla(
  p_meeting_id uuid,
  p_scheduled_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.agency_meetings%rowtype;
  v_user uuid;
begin
  if p_scheduled_at is null or p_scheduled_at < now() - interval '1 minute' then
    raise exception 'STATE';
  end if;
  if not public.agency_meeting_yonetici_mi(p_meeting_id) then raise exception 'ACCESS_DENIED'; end if;
  select * into v_m from public.agency_meetings where id = p_meeting_id and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_m.status in ('ended', 'cancelled', 'live') then raise exception 'STATE'; end if;
  update public.agency_meetings set
    status = 'scheduled',
    scheduled_at = p_scheduled_at,
    updated_at = now()
  where id = v_m.id;
  delete from public.agency_meeting_notice_log
  where meeting_id = v_m.id and kind = 'reminder_30';
  perform public.agency_meeting_olay_yaz(v_m.id, 'rescheduled', auth.uid(),
    jsonb_build_object('scheduled_at', p_scheduled_at));
  for v_user in
    select invitee_user_id from public.agency_meeting_invitations
    where meeting_id = v_m.id and status in ('pending', 'accepted')
  loop
    perform public.agency_meeting_bildir(v_m.id, v_user, 'rescheduled', v_m.title, 'rescheduled');
  end loop;
  return public.agency_meeting_detay(v_m.id);
end;
$$;

create or replace function public.agency_meeting_kilitle(p_meeting_id uuid, p_lock boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.agency_meetings%rowtype;
begin
  if not public.agency_meeting_yonetici_mi(p_meeting_id) then raise exception 'ACCESS_DENIED'; end if;
  select * into v_m from public.agency_meetings where id = p_meeting_id and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_m.status <> 'live' then raise exception 'STATE'; end if;
  update public.agency_meetings set
    locked_at = case when p_lock then now() else null end,
    updated_at = now()
  where id = v_m.id;
  perform public.agency_meeting_olay_yaz(
    v_m.id, case when p_lock then 'locked' else 'unlocked' end, auth.uid(), '{}'::jsonb
  );
  return public.agency_meeting_detay(v_m.id);
end;
$$;

create or replace function public.agency_meeting_rol_ata(
  p_meeting_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.agency_meetings%rowtype;
begin
  if p_role not in ('co_host', 'speaker', 'listener') then
    raise exception 'ACCESS_DENIED';
  end if;
  if not public.agency_meeting_yonetici_mi(p_meeting_id) then raise exception 'ACCESS_DENIED'; end if;
  if p_user_id = public.agency_meeting_resmi_id() and p_role <> 'speaker' then
    raise exception 'ACCESS_DENIED';
  end if;
  select * into v_m from public.agency_meetings where id = p_meeting_id and status = 'live' and deleted_at is null;
  if not found then raise exception 'STATE'; end if;
  update public.agency_meeting_participants set
    role = p_role,
    can_speak = p_role in ('co_host', 'speaker'),
    can_video = p_role in ('co_host', 'speaker') and v_m.media_type <> 'audio',
    muted_by_host = false,
    video_off_by_host = false,
    hand_raised_at = null,
    updated_at = now()
  where meeting_id = p_meeting_id and user_id = p_user_id and status = 'joined'
    and role not in ('host', 'platform');
  if not found then raise exception 'NOT_FOUND'; end if;
  perform public.agency_meeting_sistem(
    p_meeting_id,
    case when p_role = 'listener' then 'moved_off_stage' else 'moved_on_stage' end
  );
  perform public.agency_meeting_olay_yaz(p_meeting_id, 'role_' || p_role, p_user_id, '{}'::jsonb);
end;
$$;

create or replace function public.agency_meeting_medya_kapat(
  p_meeting_id uuid,
  p_user_id uuid,
  p_mic boolean,
  p_camera boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.agency_meeting_yonetici_mi(p_meeting_id) then raise exception 'ACCESS_DENIED'; end if;
  update public.agency_meeting_participants set
    can_speak = case when p_mic then false else can_speak end,
    muted_by_host = case when p_mic then true else muted_by_host end,
    can_video = case when p_camera then false else can_video end,
    video_off_by_host = case when p_camera then true else video_off_by_host end,
    updated_at = now()
  where meeting_id = p_meeting_id and user_id = p_user_id and status = 'joined'
    and role not in ('host', 'platform');
  if not found then raise exception 'NOT_FOUND'; end if;
  perform public.agency_meeting_olay_yaz(p_meeting_id, 'media_restricted', p_user_id,
    jsonb_build_object('mic', p_mic, 'camera', p_camera));
end;
$$;

create or replace function public.agency_meeting_cikar(p_meeting_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id = auth.uid() then raise exception 'ACCESS_DENIED'; end if;
  if not public.agency_meeting_yonetici_mi(p_meeting_id) then raise exception 'ACCESS_DENIED'; end if;
  update public.agency_meeting_participants set
    status = 'removed',
    can_speak = false,
    can_video = false,
    left_at = now(),
    updated_at = now()
  where meeting_id = p_meeting_id and user_id = p_user_id and role not in ('host', 'platform');
  if not found then raise exception 'NOT_FOUND'; end if;
  perform public.agency_meeting_olay_yaz(p_meeting_id, 'removed', p_user_id, '{}'::jsonb);
end;
$$;

create or replace function public.agency_meeting_soz_iste(p_meeting_id uuid, p_raise boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'ACCESS_DENIED'; end if;
  update public.agency_meeting_participants set
    hand_raised_at = case when p_raise then now() else null end,
    updated_at = now()
  where meeting_id = p_meeting_id and user_id = auth.uid() and status = 'joined';
  if not found then raise exception 'ACCESS_DENIED'; end if;
end;
$$;

create or replace function public.agency_meeting_mesaj_gonder(
  p_meeting_id uuid,
  p_body text,
  p_kind text default 'text'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_body text := trim(coalesce(p_body, ''));
  v_kind text := case when p_kind = 'emoji' then 'emoji' else 'text' end;
  v_can boolean;
begin
  if auth.uid() is null then raise exception 'ACCESS_DENIED'; end if;
  if not public.agency_meeting_gorebilir(p_meeting_id) then raise exception 'ACCESS_DENIED'; end if;
  select can_chat into v_can from public.agency_meeting_participants
  where meeting_id = p_meeting_id and user_id = auth.uid() and status = 'joined';
  if not coalesce(v_can, false) then raise exception 'ACCESS_DENIED'; end if;
  if v_kind = 'emoji' and char_length(v_body) > 32 then raise exception 'TITLE'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 500 then raise exception 'TITLE'; end if;
  insert into public.agency_meeting_messages (meeting_id, sender_id, kind, body)
  values (p_meeting_id, auth.uid(), v_kind, v_body)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.agency_meeting_baslik_duzenle(
  p_meeting_id uuid,
  p_title text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text := left(trim(coalesce(p_title, '')), 80);
begin
  if char_length(v_title) < 2 then raise exception 'TITLE'; end if;
  if not public.agency_meeting_yonetici_mi(p_meeting_id) then raise exception 'ACCESS_DENIED'; end if;
  update public.agency_meetings set title = v_title, updated_at = now()
  where id = p_meeting_id and deleted_at is null and status not in ('ended', 'cancelled');
  if not found then raise exception 'STATE'; end if;
  perform public.agency_meeting_olay_yaz(p_meeting_id, 'renamed', null, '{}'::jsonb);
  return public.agency_meeting_detay(p_meeting_id);
end;
$$;

create or replace function public.agency_meeting_sonuc_kaydet(
  p_meeting_id uuid,
  p_outcome text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.agency_meetings%rowtype;
begin
  if p_outcome not in ('evaluating', 'accepted', 'rejected', 'follow_up') then
    raise exception 'STATE';
  end if;
  select * into v_m from public.agency_meetings where id = p_meeting_id and deleted_at is null;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_m.room_type <> 'creator_interview' then raise exception 'STATE'; end if;
  if v_m.agency_id is null
     or not (
       public.agency_has_permission(v_m.agency_id, 'agency.recruit_meetings')
       or public.agency_has_permission(v_m.agency_id, 'agency.manage_meetings')
     ) then
    raise exception 'ACCESS_DENIED';
  end if;
  update public.agency_meetings set recruitment_outcome = p_outcome, updated_at = now()
  where id = v_m.id;
  perform public.agency_meeting_olay_yaz(v_m.id, 'outcome', null, jsonb_build_object('outcome', p_outcome));
  return public.agency_meeting_detay(v_m.id);
end;
$$;

create or replace function public.agency_meeting_livekit_yetkisi(p_room_name text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_speak boolean;
  v_status text;
  v_meeting uuid;
begin
  if v_uid is null then raise exception 'ACCESS_DENIED'; end if;
  perform public.agency_meeting_acik_mi();
  select m.id, m.status, p.role, p.can_speak and not p.muted_by_host
    into v_meeting, v_status, v_role, v_speak
  from public.agency_meetings m
  join public.agency_meeting_participants p
    on p.meeting_id = m.id and p.user_id = v_uid and p.status = 'joined'
  where m.livekit_room_name = p_room_name
    and m.deleted_at is null;
  if not found or v_status <> 'live' then
    raise exception 'ACCESS_DENIED';
  end if;
  if v_role in ('host', 'co_host') then return 'host'; end if;
  if v_role in ('speaker', 'platform') and v_speak then return 'speaker'; end if;
  return 'listener';
end;
$$;

create or replace function public.agency_meeting_livekit_uygula(
  p_room_name text,
  p_identity uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_meeting uuid;
  v_status text;
  v_remove boolean := false;
  v_publish boolean := false;
  v_role text;
  v_speak boolean;
begin
  if auth.uid() is null then raise exception 'ACCESS_DENIED'; end if;
  select m.id, m.status into v_meeting, v_status
  from public.agency_meetings m
  where m.livekit_room_name = p_room_name and m.deleted_at is null;
  if not found then raise exception 'ACCESS_DENIED'; end if;
  if not public.agency_meeting_yonetici_mi(v_meeting) then
    raise exception 'ACCESS_DENIED';
  end if;
  select role, status = 'removed' or status = 'blocked' or v_status <> 'live',
         can_speak and not muted_by_host
    into v_role, v_remove, v_speak
  from public.agency_meeting_participants
  where meeting_id = v_meeting and user_id = p_identity;
  if not found then
    v_remove := true;
  elsif v_role in ('host', 'co_host') then
    v_publish := true;
    v_remove := false;
  elsif v_role in ('speaker', 'platform') and v_speak and v_status = 'live' then
    v_publish := true;
  else
    v_publish := false;
  end if;
  return jsonb_build_object('remove', v_remove, 'can_publish', v_publish and not v_remove);
end;
$$;

create or replace function public.admin_agency_meeting_liste(p_limit int default 40)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lim int := least(greatest(coalesce(p_limit, 40), 1), 80);
begin
  if not public.ben_admin_miyim() then raise exception 'ACCESS_DENIED'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(x) order by x.started_at desc nulls last)
    from (
      select
        m.id, m.title, m.status, m.room_type, m.started_at, m.scheduled_at,
        m.locked_at is not null as locked,
        a.name as agency_name,
        (
          select count(*) from public.agency_meeting_participants p
          where p.meeting_id = m.id and p.status = 'joined'
        ) as participant_count,
        (
          select pr.display_name from public.agency_meeting_participants p
          join public.profiles pr on pr.id = p.user_id
          where p.meeting_id = m.id and p.role = 'host'
          limit 1
        ) as host_name
      from public.agency_meetings m
      left join public.agencies a on a.id = m.agency_id
      where m.deleted_at is null and m.status in ('live', 'waiting', 'scheduled')
      order by case when m.status = 'live' then 0 else 1 end, m.created_at desc
      limit v_lim
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_agency_meeting_force_end(
  p_meeting_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.agency_meetings%rowtype;
  v_user uuid;
begin
  if not public.ben_admin_miyim() then raise exception 'ACCESS_DENIED'; end if;
  select * into v_m from public.agency_meetings where id = p_meeting_id and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_m.status in ('ended', 'cancelled') then raise exception 'STATE'; end if;
  update public.agency_meetings set
    status = 'ended',
    ended_at = now(),
    ended_by = auth.uid(),
    force_ended_by = auth.uid(),
    moderation_reason = left(coalesce(p_reason, ''), 500),
    locked_at = null,
    updated_at = now()
  where id = v_m.id;
  update public.agency_meeting_participants set
    status = case when status = 'joined' then 'left' else status end,
    left_at = case when status = 'joined' then now() else left_at end
  where meeting_id = v_m.id and status = 'joined';
  perform public.agency_meeting_sistem(v_m.id, 'force_ended');
  perform public.agency_meeting_olay_yaz(v_m.id, 'force_ended', auth.uid(),
    jsonb_build_object('reason', left(coalesce(p_reason, ''), 500)));
  for v_user in
    select user_id from public.agency_meeting_participants where meeting_id = v_m.id
  loop
    perform public.agency_meeting_bildir(v_m.id, v_user, 'force_ended', v_m.title, 'force_ended');
  end loop;
  return public.agency_meeting_detay(v_m.id);
end;
$$;

create or replace function public.agency_meeting_hatirlatmalari_gonder()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m record;
  v_user uuid;
  v_n int := 0;
begin
  if public.kill_switch_aktif_mi('kill_agency_meetings')
     or not public.ozellik_bayragi_aktif_mi('agency_meetings_enabled') then
    return 0;
  end if;
  for v_m in
    select id, title
    from public.agency_meetings
    where deleted_at is null
      and status in ('scheduled', 'waiting')
      and scheduled_at is not null
      and scheduled_at > now()
      and scheduled_at <= now() + interval '30 minutes'
  loop
    for v_user in
      select invitee_user_id from public.agency_meeting_invitations
      where meeting_id = v_m.id and status in ('pending', 'accepted')
      union
      select user_id from public.agency_meeting_participants
      where meeting_id = v_m.id and status in ('joined', 'invited')
    loop
      perform public.agency_meeting_bildir(
        v_m.id, v_user, 'reminder_30', v_m.title, 'reminder'
      );
      v_n := v_n + 1;
    end loop;
  end loop;
  update public.agency_meeting_invitations set status = 'expired', responded_at = now()
  where status = 'pending' and expires_at is not null and expires_at < now();
  return v_n;
end;
$$;

-- LiveKit token: ajans odasında istemcinin istediği rol yok sayılır.
create or replace function public.livekit_token_istegi_kaydet(
  p_room_name text,
  p_role text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_uid uuid := auth.uid();
  v_role text := p_role;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if public.kill_switch_aktif_mi('kill_live') then
    raise exception 'Live/Voice temporarily disabled';
  end if;
  if p_room_name like 'am-%' then
    v_role := public.agency_meeting_livekit_yetkisi(p_room_name);
    if v_role is distinct from p_role then
      raise exception 'ACCESS_DENIED';
    end if;
  end if;
  insert into public.livekit_token_requests (user_id, room_name, role)
  values (v_uid, p_room_name, v_role)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.agency_meetings enable row level security;
alter table public.agency_meeting_participants enable row level security;
alter table public.agency_meeting_invitations enable row level security;
alter table public.agency_meeting_messages enable row level security;
alter table public.agency_meeting_events enable row level security;
alter table public.agency_meeting_notice_log enable row level security;

drop policy if exists agency_meetings_select on public.agency_meetings;
create policy agency_meetings_select on public.agency_meetings
  for select to authenticated
  using (deleted_at is null and public.agency_meeting_gorebilir(id));

drop policy if exists agency_meeting_participants_select on public.agency_meeting_participants;
create policy agency_meeting_participants_select on public.agency_meeting_participants
  for select to authenticated
  using (public.agency_meeting_gorebilir(meeting_id));

drop policy if exists agency_meeting_invitations_select on public.agency_meeting_invitations;
create policy agency_meeting_invitations_select on public.agency_meeting_invitations
  for select to authenticated
  using (
    invitee_user_id = auth.uid()
    or invited_by = auth.uid()
    or public.ben_admin_miyim()
    or exists (
      select 1 from public.agency_meetings m
      where m.id = agency_meeting_invitations.meeting_id
        and m.agency_id is not null
        and public.agency_has_permission(m.agency_id, 'agency.manage_meetings')
    )
  );

drop policy if exists agency_meeting_messages_select on public.agency_meeting_messages;
create policy agency_meeting_messages_select on public.agency_meeting_messages
  for select to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.agency_meeting_participants p
      where p.meeting_id = agency_meeting_messages.meeting_id
        and p.user_id = auth.uid()
        and p.status in ('joined', 'left')
    )
  );

drop policy if exists agency_meeting_events_select on public.agency_meeting_events;
create policy agency_meeting_events_select on public.agency_meeting_events
  for select to authenticated
  using (
    public.ben_admin_miyim()
    or (
      agency_id is not null
      and public.agency_has_permission(agency_id, 'agency.view_audit')
    )
  );

drop policy if exists agency_meeting_notice_log_select on public.agency_meeting_notice_log;
create policy agency_meeting_notice_log_select on public.agency_meeting_notice_log
  for select to authenticated
  using (user_id = auth.uid() or public.ben_admin_miyim());

grant select on public.agency_meetings to authenticated;
grant select on public.agency_meeting_participants to authenticated;
grant select on public.agency_meeting_invitations to authenticated;
grant select on public.agency_meeting_messages to authenticated;
grant select on public.agency_meeting_events to authenticated;
grant select on public.agency_meeting_notice_log to authenticated;

revoke all on function public.agency_meeting_acik_mi() from public, anon, authenticated;
revoke all on function public.agency_meeting_resmi_id() from public, anon, authenticated;
revoke all on function public.agency_meeting_olay_yaz(uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.agency_meeting_bildir(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.agency_meeting_sistem(uuid, text) from public, anon, authenticated;
revoke all on function public.agency_meeting_uye_mi(uuid, uuid) from public, anon, authenticated;
revoke all on function public.agency_meeting_kisi_uygun_mu(uuid) from public, anon, authenticated;
revoke all on function public.agency_meeting_engel_var_mi(uuid, uuid) from public, anon, authenticated;
revoke all on function public.agency_meeting_hatirlatmalari_gonder() from public, anon, authenticated;

grant execute on function public.agency_meeting_ben_resmi_miyim() to authenticated;
grant execute on function public.agency_meeting_ozet(uuid) to authenticated;
grant execute on function public.agency_meeting_liste(uuid, text, timestamptz, int) to authenticated;
grant execute on function public.agency_meeting_detay(uuid) to authenticated;
grant execute on function public.agency_meeting_katilimcilar(uuid) to authenticated;
grant execute on function public.agency_meeting_mesajlar(uuid, timestamptz, int) to authenticated;
grant execute on function public.agency_meeting_davetlerim(int) to authenticated;
grant execute on function public.agency_meeting_olustur(uuid, text, text, text, text, text, timestamptz, int, int, text[], boolean) to authenticated;
grant execute on function public.agency_meeting_davet_yanit(uuid, boolean) to authenticated;
grant execute on function public.agency_meeting_katil(uuid, text) to authenticated;
grant execute on function public.agency_meeting_ayril(uuid) to authenticated;
grant execute on function public.agency_meeting_bitir(uuid) to authenticated;
grant execute on function public.agency_meeting_iptal(uuid) to authenticated;
grant execute on function public.agency_meeting_yeniden_planla(uuid, timestamptz) to authenticated;
grant execute on function public.agency_meeting_kilitle(uuid, boolean) to authenticated;
grant execute on function public.agency_meeting_rol_ata(uuid, uuid, text) to authenticated;
grant execute on function public.agency_meeting_medya_kapat(uuid, uuid, boolean, boolean) to authenticated;
grant execute on function public.agency_meeting_cikar(uuid, uuid) to authenticated;
grant execute on function public.agency_meeting_soz_iste(uuid, boolean) to authenticated;
grant execute on function public.agency_meeting_mesaj_gonder(uuid, text, text) to authenticated;
grant execute on function public.agency_meeting_baslik_duzenle(uuid, text) to authenticated;
grant execute on function public.agency_meeting_sonuc_kaydet(uuid, text) to authenticated;
grant execute on function public.agency_meeting_livekit_yetkisi(text) to authenticated;
grant execute on function public.agency_meeting_livekit_uygula(text, uuid) to authenticated;
grant execute on function public.admin_agency_meeting_liste(int) to authenticated;
grant execute on function public.admin_agency_meeting_force_end(uuid, text) to authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.agency_meetings;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.agency_meeting_participants;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.agency_meeting_messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.agency_meeting_invitations;
  exception when duplicate_object then null;
  end;
end $$;

alter table public.agency_meetings replica identity full;
alter table public.agency_meeting_participants replica identity full;
alter table public.agency_meeting_messages replica identity full;
alter table public.agency_meeting_invitations replica identity full;

do $$
begin
  perform cron.unschedule('agency-meeting-reminders');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule(
    'agency-meeting-reminders',
    '*/5 * * * *',
    $cron$ select public.agency_meeting_hatirlatmalari_gonder(); $cron$
  );
exception when others then
  raise notice 'pg_cron schedule basarisiz: %', SQLERRM;
end $$;
