import type { Profile } from '../../../types/models';
import { AdminYetkisiVarMi } from './AdminYetkisiVarMi';

/**
 * Panel içi izin kontrolü — UI gate.
 * Super admin her zaman true; aksi halde permissions setinde key aranır.
 * Panel girişi için AdminYetkisiVarMi (is_admin) kullanılır.
 */
export function AdminIzinVarMi(
  profile: Profile | null | undefined,
  permissions: Iterable<string> | Set<string> | string[] | null | undefined,
  key: string,
  opts?: { isSuper?: boolean },
): boolean {
  if (!AdminYetkisiVarMi(profile)) return false;
  if (opts?.isSuper) return true;
  if (!key) return false;
  if (!permissions) return false;
  if (permissions instanceof Set) return permissions.has(key);
  if (Array.isArray(permissions)) return permissions.includes(key);
  for (const p of permissions) {
    if (p === key) return true;
  }
  return false;
}
