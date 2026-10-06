/**
 * Admin RBAC V2 — yönetim RPC sarmalayıcıları.
 */
import { supabase } from '../../../lib/supabase';

function asObj(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function asArr<T = unknown>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  return [];
}

function rpcHata(error: { message: string } | null): never {
  throw new Error(error?.message ?? 'RPC hatası');
}

export type AdminMyPermissions = {
  ok: boolean;
  permissions: string[];
  is_super: boolean;
  status: string | null;
  count: number;
  error?: string;
  user_id?: string;
};

export type AdminPermissionCatalogItem = {
  permission_key: string;
  label: string;
  description?: string | null;
  category: string;
  risk: string;
  module_href?: string | null;
  sort_order?: number;
};

export type AdminRoleItem = {
  role_code: string;
  name: string;
  description?: string | null;
  is_system: boolean;
  is_super: boolean;
  sort_order?: number;
  permission_count: number;
};

export type AdminListItem = {
  user_id: string;
  display_name: string;
  username?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  status: string;
  role_code: string;
  role_name?: string | null;
  is_super: boolean;
  last_login_at?: string | null;
  created_at?: string | null;
  permission_count: number;
  permission_summary: string;
};

export type AdminListResult = {
  ok: boolean;
  total: number;
  items: AdminListItem[];
};

export type AdminOverrideItem = {
  permission_key: string;
  effect: 'ALLOW' | 'DENY' | string;
  reason?: string | null;
};

export type AdminDetailResult = {
  ok: boolean;
  admin: {
    user_id: string;
    display_name: string;
    username?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    status: string;
    phone?: string | null;
    role_code: string;
    role_name?: string | null;
    is_super: boolean;
    last_login_at?: string | null;
    created_at?: string | null;
    notes?: string | null;
  };
  permissions: string[];
  permission_count: number;
  by_category: Record<string, number>;
  high_risk: string[];
  overrides: AdminOverrideItem[];
  role_permissions: string[];
};

export type AdminMenuPreviewItem = {
  permission_key: string;
  label: string;
  category: string;
  module_href?: string | null;
};

export type AdminAuditItem = {
  id: string;
  actor_id?: string | null;
  actor_name?: string | null;
  target_user_id?: string | null;
  target_name?: string | null;
  action: string;
  added?: unknown;
  removed?: unknown;
  reason?: string | null;
  metadata?: unknown;
  created_at: string;
};

export type AdminRpcOk = { ok: boolean } & Record<string, unknown>;

export async function AdminMyPermissionsGetir(): Promise<AdminMyPermissions> {
  const { data, error } = await supabase.rpc('admin_my_permissions');
  if (error) rpcHata(error);
  const o = asObj(data);
  const perms = asArr<string>(o.permissions).map(String);
  return {
    ok: o.ok !== false,
    permissions: perms,
    is_super: !!o.is_super,
    status: o.status != null ? String(o.status) : null,
    count: typeof o.count === 'number' ? o.count : perms.length,
    error: o.error != null ? String(o.error) : undefined,
    user_id: o.user_id != null ? String(o.user_id) : undefined,
  };
}

export async function AdminTouchLogin(): Promise<AdminRpcOk> {
  const { data, error } = await supabase.rpc('admin_touch_login');
  if (error) rpcHata(error);
  return asObj(data) as AdminRpcOk;
}

export async function AdminPermissionCatalogList(): Promise<AdminPermissionCatalogItem[]> {
  const { data, error } = await supabase.rpc('admin_permission_catalog_list');
  if (error) rpcHata(error);
  return asArr<AdminPermissionCatalogItem>(data);
}

export async function AdminRolesList(): Promise<AdminRoleItem[]> {
  const { data, error } = await supabase.rpc('admin_roles_list');
  if (error) rpcHata(error);
  return asArr<AdminRoleItem>(data);
}

export async function AdminListAdmins(params?: {
  search?: string | null;
  role?: string | null;
  status?: string | null;
  permission?: string | null;
  limit?: number;
  offset?: number;
}): Promise<AdminListResult> {
  const { data, error } = await supabase.rpc('admin_list_admins', {
    p_search: params?.search ?? null,
    p_role: params?.role ?? null,
    p_status: params?.status ?? null,
    p_permission: params?.permission ?? null,
    p_limit: params?.limit ?? 50,
    p_offset: params?.offset ?? 0,
  });
  if (error) rpcHata(error);
  const o = asObj(data);
  return {
    ok: o.ok !== false,
    total: typeof o.total === 'number' ? o.total : 0,
    items: asArr<AdminListItem>(o.items),
  };
}

export async function AdminGetAdminDetail(userId: string): Promise<AdminDetailResult> {
  const { data, error } = await supabase.rpc('admin_get_admin_detail', {
    p_user_id: userId,
  });
  if (error) rpcHata(error);
  const o = asObj(data);
  return {
    ok: o.ok !== false,
    admin: asObj(o.admin) as AdminDetailResult['admin'],
    permissions: asArr<string>(o.permissions).map(String),
    permission_count: typeof o.permission_count === 'number' ? o.permission_count : 0,
    by_category: (asObj(o.by_category) as Record<string, number>) ?? {},
    high_risk: asArr<string>(o.high_risk).map(String),
    overrides: asArr<AdminOverrideItem>(o.overrides),
    role_permissions: asArr<string>(o.role_permissions).map(String),
  };
}

export async function AdminPermissionHolders(permission: string): Promise<unknown[]> {
  const { data, error } = await supabase.rpc('admin_permission_holders', {
    p_permission: permission,
  });
  if (error) rpcHata(error);
  return asArr(data);
}

export async function AdminPreviewMenu(
  permissions?: string[] | null,
): Promise<AdminMenuPreviewItem[]> {
  const { data, error } = await supabase.rpc('admin_preview_menu', {
    p_permissions: permissions ?? null,
  });
  if (error) rpcHata(error);
  return asArr<AdminMenuPreviewItem>(data);
}

export async function AdminPromoteUser(input: {
  userId: string;
  roleCode: string;
  status?: string;
  phone?: string | null;
  allowOverrides?: string[] | null;
  denyOverrides?: string[] | null;
  reason?: string | null;
}): Promise<AdminRpcOk> {
  const { data, error } = await supabase.rpc('admin_promote_user', {
    p_user_id: input.userId,
    p_role_code: input.roleCode,
    p_status: input.status ?? 'ACTIVE',
    p_phone: input.phone ?? null,
    p_allow_overrides: input.allowOverrides ?? null,
    p_deny_overrides: input.denyOverrides ?? null,
    p_reason: input.reason ?? null,
  });
  if (error) rpcHata(error);
  return asObj(data) as AdminRpcOk;
}

export async function AdminUpdateAdminStatus(
  userId: string,
  status: string,
  reason?: string | null,
): Promise<AdminRpcOk> {
  const { data, error } = await supabase.rpc('admin_update_admin_status', {
    p_user_id: userId,
    p_status: status,
    p_reason: reason ?? null,
  });
  if (error) rpcHata(error);
  return asObj(data) as AdminRpcOk;
}

export async function AdminSetAdminRole(
  userId: string,
  roleCode: string,
  reason?: string | null,
): Promise<AdminRpcOk> {
  const { data, error } = await supabase.rpc('admin_set_admin_role', {
    p_user_id: userId,
    p_role_code: roleCode,
    p_reason: reason ?? null,
  });
  if (error) rpcHata(error);
  return asObj(data) as AdminRpcOk;
}

export async function AdminSavePermissionOverrides(input: {
  userId: string;
  allows: string[];
  denies: string[];
  reason?: string | null;
}): Promise<AdminRpcOk> {
  const { data, error } = await supabase.rpc('admin_save_permission_overrides', {
    p_user_id: input.userId,
    p_allows: input.allows,
    p_denies: input.denies,
    p_reason: input.reason ?? null,
  });
  if (error) rpcHata(error);
  return asObj(data) as AdminRpcOk;
}

export async function AdminDemoteAdmin(
  userId: string,
  reason?: string | null,
): Promise<AdminRpcOk> {
  const { data, error } = await supabase.rpc('admin_demote_admin', {
    p_user_id: userId,
    p_reason: reason ?? null,
  });
  if (error) rpcHata(error);
  return asObj(data) as AdminRpcOk;
}

export async function AdminRoleCreate(input: {
  roleCode: string;
  name: string;
  description?: string;
  permissions?: string[];
}): Promise<AdminRpcOk> {
  const { data, error } = await supabase.rpc('admin_role_create', {
    p_role_code: input.roleCode,
    p_name: input.name,
    p_description: input.description ?? '',
    p_permissions: input.permissions ?? [],
  });
  if (error) rpcHata(error);
  return asObj(data) as AdminRpcOk;
}

export async function AdminRoleCopy(input: {
  sourceRole: string;
  newRoleCode: string;
  newName: string;
}): Promise<AdminRpcOk> {
  const { data, error } = await supabase.rpc('admin_role_copy', {
    p_source_role: input.sourceRole,
    p_new_role_code: input.newRoleCode,
    p_new_name: input.newName,
  });
  if (error) rpcHata(error);
  return asObj(data) as AdminRpcOk;
}

export async function AdminRoleUpdatePermissions(
  roleCode: string,
  permissions: string[],
  reason?: string | null,
): Promise<AdminRpcOk> {
  const { data, error } = await supabase.rpc('admin_role_update_permissions', {
    p_role_code: roleCode,
    p_permissions: permissions,
    p_reason: reason ?? null,
  });
  if (error) rpcHata(error);
  return asObj(data) as AdminRpcOk;
}

export async function AdminRoleDelete(roleCode: string): Promise<AdminRpcOk> {
  const { data, error } = await supabase.rpc('admin_role_delete', {
    p_role_code: roleCode,
  });
  if (error) rpcHata(error);
  return asObj(data) as AdminRpcOk;
}

export async function AdminRoleGetPermissions(roleCode: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('admin_role_get_permissions', {
    p_role_code: roleCode,
  });
  if (error) rpcHata(error);
  return asArr<string>(data).map(String);
}

export async function AdminPermissionAuditList(
  targetUserId?: string | null,
  limit = 40,
): Promise<AdminAuditItem[]> {
  const { data, error } = await supabase.rpc('admin_permission_audit_list', {
    p_target_user_id: targetUserId ?? null,
    p_limit: limit,
  });
  if (error) rpcHata(error);
  return asArr<AdminAuditItem>(data);
}
