import { supabase } from '../../../lib/supabase';
import type { Profile } from '../../../types/models';
import { PerformansTelemetri } from '../../../ortak/performans/PerformansTelemetri';

/** Profile tipi + Auth/UI'nin kullandığı kolonlar — schema doğrulandı */
export const PROFIL_SELECT = [
  'id',
  'public_user_id',
  'username',
  'display_name',
  'bio',
  'avatar_url',
  'cover_url',
  'phone_e164',
  'gender',
  'birth_date',
  'custom_fields',
  'country',
  'country_code',
  'region_id',
  'language',
  'is_host',
  'is_guest',
  'is_admin',
  'is_verified',
  'selected_title_id',
  'level',
  'xp',
  'primary_city_id',
  'created_at',
  'banned_at',
  'ban_reason',
  'deleted_at',
  'deletion_requested_at',
  'child_protection_consent_status',
  'child_protection_consent_at',
  'selected_title_id',
].join(', ');

export async function ProfilGetir(userId: string): Promise<Profile | null> {
  return PerformansTelemetri.olc('ProfilGetir', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFIL_SELECT)
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as Profile | null;
  });
}

export async function PublicIdIleProfilGetir(
  publicId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFIL_SELECT)
    .eq('public_user_id', publicId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Profile | null;
}
