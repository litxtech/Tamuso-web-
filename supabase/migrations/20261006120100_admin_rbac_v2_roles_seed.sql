-- =============================================================================
-- Admin RBAC V2: role permission templates (system roles)
-- SUPER_ADMIN: is_super bypass — role_permissions optional but seeded for audit UI
-- =============================================================================

-- SUPER_ADMIN gets all catalog permissions (for display / role copy)
insert into public.admin_role_permissions (role_code, permission_code)
select 'SUPER_ADMIN', c.permission_key
from public.admin_permission_catalog c
where c.is_active
on conflict do nothing;

-- READ_ONLY_ADMIN: all *.view / *.read / search / detail
insert into public.admin_role_permissions (role_code, permission_code)
select 'READ_ONLY_ADMIN', c.permission_key
from public.admin_permission_catalog c
where c.is_active
  and (
    c.permission_key like '%.view'
    or c.permission_key like '%.read'
    or c.permission_key like '%search%'
    or c.permission_key like '%.detail.view'
    or c.permission_key like '%.analytics%'
    or c.permission_key in ('dashboard.view', 'analytics.view')
  )
  and c.permission_key not like 'admin.%'
on conflict do nothing;

-- FINANCE_ADMIN
insert into public.admin_role_permissions (role_code, permission_code)
select 'FINANCE_ADMIN', x from unnest(array[
  'dashboard.view',
  'finance.view','finance.revenue.view','finance.expenses.view','finance.expense.create',
  'finance.expense.edit','finance.liabilities.view','finance.pnl.view','finance.forecast.view',
  'finance.reconciliation.view','finance.export','finance.pdf.generate','finance.volume.view',
  'finance.league.view','finance.commission.edit',
  'payout.view','payout.approve','payout.reject',
  'coins.view','coins.sales.view','coins.balance.view','coins.transactions.view',
  'coins.adjust','coins.package.create','coins.package.edit','coins.package.disable',
  'coins.ledger.view','diamonds.adjust',
  'wallet.ui.manage','wallet.exchange.view','wallet.exchange.manage',
  'wallet.iap.disputes.view','wallet.iap.disputes.manage',
  'users.view','users.search','users.detail.view','users.finance.view',
  'agencies.view','agencies.finance.view','agencies.packages.view',
  'economy.view','analytics.view'
]) as x
on conflict do nothing;

-- Map legacy FINANCE → same as FINANCE_ADMIN core + keep existing verification perms
insert into public.admin_role_permissions (role_code, permission_code)
select 'FINANCE', permission_code from public.admin_role_permissions where role_code = 'FINANCE_ADMIN'
on conflict do nothing;

-- AGENCY_ADMIN
insert into public.admin_role_permissions (role_code, permission_code)
select 'AGENCY_ADMIN', x from unnest(array[
  'dashboard.view',
  'agencies.view','agencies.create','agencies.edit','agencies.suspend',
  'agencies.finance.view','agencies.creators.view','agencies.users.view',
  'agencies.export','agencies.packages.view','agencies.packages.manage',
  'agency.application.read','agency.application.review',
  'verification.view','verification.metadata.read','verification.document.read',
  'kyc.view','kyc.read','kyb.read',
  'users.view','users.search','users.detail.view',
  'finance.commission.edit','analytics.view'
]) as x
on conflict do nothing;

insert into public.admin_role_permissions (role_code, permission_code)
select 'AGENCY_MANAGER', permission_code from public.admin_role_permissions where role_code = 'AGENCY_ADMIN'
on conflict do nothing;

-- MODERATION_ADMIN
insert into public.admin_role_permissions (role_code, permission_code)
select 'MODERATION_ADMIN', x from unnest(array[
  'dashboard.view',
  'moderation.view','moderation.manage',
  'live.view','live.rooms.view','live.moderate','live.end','live.ban','live.analytics.view',
  'stories.view','stories.delete','stories.moderate','stories.reports.view',
  'security.call.view','security.platform.view','security.child.view',
  'users.view','users.search','users.detail.view','users.ban','users.unban','users.suspend',
  'support.view','ops.security.view'
]) as x
on conflict do nothing;

-- SUPPORT_ADMIN
insert into public.admin_role_permissions (role_code, permission_code)
select 'SUPPORT_ADMIN', x from unnest(array[
  'dashboard.view',
  'support.view','support.manage',
  'users.view','users.search','users.detail.view',
  'directory.view',
  'moderation.view',
  'live.view','live.rooms.view',
  'wallet.exchange.view',
  'notifications.view'
]) as x
on conflict do nothing;

insert into public.admin_role_permissions (role_code, permission_code)
select 'SUPPORT', permission_code from public.admin_role_permissions where role_code = 'SUPPORT_ADMIN'
on conflict do nothing;

-- CONTENT_ADMIN
insert into public.admin_role_permissions (role_code, permission_code)
select 'CONTENT_ADMIN', x from unnest(array[
  'dashboard.view',
  'content.feedback.view','content.feedback.manage',
  'content.titles.view','content.titles.manage',
  'content.music.view','content.music.manage',
  'content.ai_music.view','content.ai_music.manage',
  'content.banners.view','content.banners.manage',
  'content.lobby.view','content.lobby.manage',
  'content.policies.view','content.policies.manage',
  'content.menu.view','content.menu.manage',
  'content.register.view','content.register.manage',
  'content.contact.view','content.contact.manage',
  'content.share.view','content.share.manage',
  'content.discovery.view','content.discovery.manage',
  'content.city.view','content.city.manage',
  'stories.view','stories.moderate','stories.settings.manage',
  'announcement.create','announcement.edit','announcement.delete','announcement.publish',
  'announcement.analytics','announcement.view_users',
  'notifications.view','notifications.manage'
]) as x
on conflict do nothing;

-- GAME_ADMIN
insert into public.admin_role_permissions (role_code, permission_code)
select 'GAME_ADMIN', x from unnest(array[
  'dashboard.view',
  'games.view','games.create','games.edit','games.approve','games.reject',
  'games.publish','games.unpublish','games.finance.view','games.analytics.view',
  'games.disable','games.feature.toggle','games.test.view',
  'games.algorithm.view','games.algorithm.manage',
  'games.kaskad.view','games.kaskad.manage',
  'games.fruit_wheel.view','games.fruit_wheel.manage',
  'studio.view','studio.manage',
  'economy.view'
]) as x
on conflict do nothing;

-- ANALYTICS_ADMIN
insert into public.admin_role_permissions (role_code, permission_code)
select 'ANALYTICS_ADMIN', x from unnest(array[
  'dashboard.view','analytics.view',
  'finance.view','finance.revenue.view','finance.pnl.view','finance.forecast.view',
  'finance.volume.view','finance.league.view','finance.pdf.generate',
  'coins.view','coins.sales.view','coins.ledger.view',
  'games.analytics.view','live.analytics.view',
  'announcement.analytics','users.view','agencies.view'
]) as x
on conflict do nothing;
