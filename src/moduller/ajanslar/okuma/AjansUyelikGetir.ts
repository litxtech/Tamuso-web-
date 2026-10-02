import { supabase } from '../../../lib/supabase';

export type AjansUyelikRol = 'owner' | 'manager' | 'member' | 'pending' | 'none';

export type AjansUyelikAjans = {
  id: string;
  agency_public_id: string;
  name: string;
  logo_url: string | null;
  slogan: string | null;
  status: string;
  owner_id: string;
};

export type AjansUyelik = {
  role: AjansUyelikRol;
  agency: AjansUyelikAjans | null;
  application_id: string | null;
  application_status: string | null;
};

const BOS: AjansUyelik = {
  role: 'none',
  agency: null,
  application_id: null,
  application_status: null,
};

const AJANS_ALAN =
  'id, agency_public_id, name, logo_url, slogan, status, owner_id';

function normalize(raw: unknown): AjansUyelik {
  if (!raw || typeof raw !== 'object') return BOS;
  const d = raw as Record<string, unknown>;
  const role = d.role;
  if (
    role !== 'owner' &&
    role !== 'manager' &&
    role !== 'member' &&
    role !== 'pending' &&
    role !== 'none'
  ) {
    return BOS;
  }
  const agency = ajansNormalize(d.agency);
  return {
    role,
    agency,
    application_id: typeof d.application_id === 'string' ? d.application_id : null,
    application_status:
      typeof d.application_status === 'string' ? d.application_status : null,
  };
}

function ajansNormalize(raw: unknown): AjansUyelikAjans | null {
  if (!raw || typeof raw !== 'object') return null;
  const x = raw as Record<string, unknown>;
  if (typeof x.id !== 'string' || typeof x.name !== 'string') return null;
  return {
    id: x.id,
    agency_public_id: typeof x.agency_public_id === 'string' ? x.agency_public_id : '',
    name: x.name,
    logo_url: typeof x.logo_url === 'string' ? x.logo_url : null,
    slogan: typeof x.slogan === 'string' ? x.slogan : null,
    status: typeof x.status === 'string' ? x.status : '',
    owner_id: typeof x.owner_id === 'string' ? x.owner_id : '',
  };
}

async function ajansOzet(agencyId: string): Promise<AjansUyelikAjans | null> {
  const { data, error } = await supabase
    .from('agencies')
    .select(AJANS_ALAN)
    .eq('id', agencyId)
    .neq('status', 'closed')
    .maybeSingle();
  if (error) return null;
  return ajansNormalize(data);
}

/** RPC yoksa host_profiles / agencies / başvurular. */
async function AjansUyelikYedekGetir(userId?: string): Promise<AjansUyelik> {
  const oturum = (await supabase.auth.getUser()).data.user?.id;
  const uid = userId ?? oturum;
  if (!uid) return BOS;
  const kendim = uid === oturum;

  const { data: sahip } = await supabase
    .from('agencies')
    .select(AJANS_ALAN)
    .eq('owner_id', uid)
    .neq('status', 'closed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const sahipAjans = ajansNormalize(sahip);
  if (sahipAjans) {
    return {
      role: 'owner',
      agency: sahipAjans,
      application_id: null,
      application_status: null,
    };
  }

  const { data: yonetici } = await supabase
    .from('agency_staff_roles')
    .select('agency_id')
    .eq('user_id', uid)
    .eq('role_code', 'MANAGER')
    .limit(1)
    .maybeSingle();
  if (yonetici?.agency_id) {
    const agency = await ajansOzet(yonetici.agency_id);
    if (agency) {
      return {
        role: 'manager',
        agency,
        application_id: null,
        application_status: null,
      };
    }
  }

  const { data: hp } = await supabase
    .from('host_profiles')
    .select('agency_id, status')
    .eq('user_id', uid)
    .maybeSingle();
  if (hp?.agency_id && hp.status === 'agency') {
    const agency = await ajansOzet(hp.agency_id);
    if (agency) {
      return {
        role: 'member',
        agency,
        application_id: null,
        application_status: null,
      };
    }
  }

  if (kendim) {
    const { data: app } = await supabase
      .from('host_applications')
      .select('id, status, agency_id')
      .eq('user_id', uid)
      .eq('path', 'join_agency')
      .eq('status', 'agency_review')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (app?.agency_id) {
      const agency = await ajansOzet(app.agency_id);
      if (agency) {
        return {
          role: 'pending',
          agency,
          application_id: typeof app.id === 'string' ? app.id : null,
          application_status:
            typeof app.status === 'string' ? app.status : 'agency_review',
        };
      }
    }
  }

  return BOS;
}

/** Kendi veya başka kullanıcının ajans kaydı (bekleyen başvuru sadece kendine). */
export async function AjansUyelikGetir(userId?: string): Promise<AjansUyelik> {
  const { data, error } = await supabase.rpc('ajans_uye_durumum', {
    p_user_id: userId ?? null,
  });
  if (!error) return normalize(data);
  return AjansUyelikYedekGetir(userId);
}
