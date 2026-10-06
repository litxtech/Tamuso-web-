import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { AdminYetkisiVarMi } from './AdminYetkisiVarMi';
import { AdminIzinVarMi } from './AdminIzinVarMi';
import {
  AdminMyPermissionsGetir,
  AdminTouchLogin,
} from '../yonetim/AdminYonetimIslemleri';

export type UseAdminPermissionsResult = {
  permissions: string[];
  permissionSet: Set<string>;
  isSuper: boolean;
  status: string | null;
  loading: boolean;
  error: string | null;
  has: (key: string) => boolean;
  refresh: () => Promise<void>;
};

/**
 * is_admin oturumunda admin_my_permissions + admin_touch_login yükler.
 */
export function useAdminPermissions(): UseAdminPermissionsResult {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isSuper, setIsSuper] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(admin);
  const [error, setError] = useState<string | null>(null);
  const touchedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!admin) {
      setPermissions([]);
      setIsSuper(false);
      setStatus(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (!touchedRef.current) {
        touchedRef.current = true;
        void AdminTouchLogin().catch(() => undefined);
      }
      const res = await AdminMyPermissionsGetir();
      if (!res.ok) {
        setPermissions([]);
        setIsSuper(false);
        setStatus(null);
        setError(res.error ?? 'İzinler yüklenemedi');
        return;
      }
      setPermissions(res.permissions ?? []);
      setIsSuper(!!res.is_super);
      setStatus(res.status ?? null);
    } catch (e) {
      setPermissions([]);
      setIsSuper(false);
      setStatus(null);
      setError(e instanceof Error ? e.message : 'İzinler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [admin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  const has = useCallback(
    (key: string) => AdminIzinVarMi(profile, permissionSet, key, { isSuper }),
    [profile, permissionSet, isSuper],
  );

  return {
    permissions,
    permissionSet,
    isSuper,
    status,
    loading,
    error,
    has,
    refresh,
  };
}
