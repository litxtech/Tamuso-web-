import { supabase } from '../../../lib/supabase';
import { MagazaUrlGecerli } from '../../surum-politikasi/MagazaUrl';
import { BuildCoz, SemverCoz, SemverKarsilastir } from '../../surum-politikasi/SemverKarsilastir';

export type SurumPlatformu = 'ios' | 'android';

export type AdminSurumPolitikasi = {
  id: string;
  platform: SurumPlatformu;
  latestVersion: string;
  latestBuild: string;
  minimumVersion: string;
  minimumBuild: string;
  forceUpdate: boolean;
  optionalUpdate: boolean;
  title: string;
  message: string;
  buttonText: string;
  storeUrl: string;
  maintenanceMessage: string;
  updatedAt: string | null;
  updatedByName: string | null;
};

export type SurumDenetim = {
  id: string;
  actorName: string | null;
  platform: SurumPlatformu;
  oldMinimum: string | null;
  newMinimum: string | null;
  oldBuild: number | null;
  newBuild: number | null;
  oldForce: boolean | null;
  newForce: boolean | null;
  storeUrlChanged: boolean;
  messageChanged: boolean;
  createdAt: string;
};

export function BosPolitika(platform: SurumPlatformu): AdminSurumPolitikasi {
  const ios = platform === 'ios';
  return {
    id: '',
    platform,
    latestVersion: '1.2.4',
    latestBuild: '0',
    minimumVersion: '1.2.4',
    minimumBuild: '0',
    forceUpdate: false,
    optionalUpdate: false,
    title: 'Yeni sürüm hazır',
    message: ios
      ? 'Tamuso’nun yeni sürümü yayınlandı. Devam etmek için uygulamanı güncelle.'
      : 'Daha hızlı ve daha iyi bir Tamuso deneyimi için uygulamanı güncelle.',
    buttonText: ios ? 'Şimdi Güncelle' : 'Güncelle',
    storeUrl: '',
    maintenanceMessage: '',
    updatedAt: null,
    updatedByName: null,
  };
}

function satirCoz(o: Record<string, unknown>): AdminSurumPolitikasi | null {
  const platform = o.platform === 'android' ? 'android' : o.platform === 'ios' ? 'ios' : null;
  if (!platform) return null;
  return {
    id: String(o.id ?? ''),
    platform,
    latestVersion: String(o.latest_version ?? ''),
    latestBuild: String(o.latest_build ?? ''),
    minimumVersion: String(o.minimum_supported_version ?? ''),
    minimumBuild: String(o.minimum_supported_build ?? ''),
    forceUpdate: o.force_update_enabled === true,
    optionalUpdate: o.optional_update_enabled === true,
    title: String(o.update_title ?? ''),
    message: String(o.update_message ?? ''),
    buttonText: String(o.button_text ?? ''),
    storeUrl: String(o.store_url ?? ''),
    maintenanceMessage: String(o.maintenance_message ?? ''),
    updatedAt: o.updated_at ? String(o.updated_at) : null,
    updatedByName: o.updated_by_name ? String(o.updated_by_name) : null,
  };
}

export async function AdminSurumListesi(): Promise<AdminSurumPolitikasi[]> {
  const { data, error } = await supabase.rpc('surum_politikasi_admin_liste');
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data
    .map((s) => satirCoz(s as Record<string, unknown>))
    .filter((s): s is AdminSurumPolitikasi => s != null);
}

export async function AdminSurumDenetimi(platform: SurumPlatformu): Promise<SurumDenetim[]> {
  const { data, error } = await supabase.rpc('surum_politikasi_denetim_liste', {
    p_platform: platform,
  });
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data.map((ham) => {
    const o = ham as Record<string, unknown>;
    return {
      id: String(o.id ?? ''),
      actorName: o.actor_name ? String(o.actor_name) : null,
      platform: o.platform === 'android' ? 'android' : 'ios',
      oldMinimum: o.old_minimum_version ? String(o.old_minimum_version) : null,
      newMinimum: o.new_minimum_version ? String(o.new_minimum_version) : null,
      oldBuild: o.old_minimum_build == null ? null : Number(o.old_minimum_build),
      newBuild: o.new_minimum_build == null ? null : Number(o.new_minimum_build),
      oldForce: o.old_force_update == null ? null : o.old_force_update === true,
      newForce: o.new_force_update == null ? null : o.new_force_update === true,
      storeUrlChanged: o.store_url_changed === true,
      messageChanged: o.message_changed === true,
      createdAt: String(o.created_at ?? ''),
    };
  });
}

export function SurumKayitDogrula(form: AdminSurumPolitikasi): string | null {
  if (!SemverCoz(form.latestVersion) || !SemverCoz(form.minimumVersion)) {
    return 'Sürüm biçimi geçersiz. Örnek: 1.3.0';
  }
  if (BuildCoz(form.latestBuild) === null || BuildCoz(form.minimumBuild) === null) {
    return 'Build numarası geçersiz.';
  }
  const karsilastir = SemverKarsilastir(form.minimumVersion, form.latestVersion);
  if (karsilastir === null || karsilastir > 0) {
    return 'Minimum sürüm, yayınlanan sürümden büyük olamaz.';
  }
  if (
    karsilastir === 0 &&
    (BuildCoz(form.minimumBuild) ?? 0) > (BuildCoz(form.latestBuild) ?? 0)
  ) {
    return 'Minimum build, yayınlanan build’den büyük olamaz.';
  }
  if (!form.title.trim() || !form.message.trim() || !form.buttonText.trim()) {
    return 'Başlık, mesaj ve buton metni gerekli.';
  }
  const url = form.storeUrl.trim();
  if (url && !MagazaUrlGecerli(form.platform, url)) {
    return form.platform === 'ios'
      ? 'iOS adresi https://apps.apple.com/… olmalı.'
      : 'Android adresi https://play.google.com/store/… olmalı.';
  }
  if (form.forceUpdate && !MagazaUrlGecerli(form.platform, url)) {
    return 'Zorunlu güncelleme açıkken mağaza adresi gerekli.';
  }
  return null;
}

export async function AdminSurumKaydet(
  form: AdminSurumPolitikasi,
): Promise<{ ok: true } | { ok: false; hata: string }> {
  const yerel = SurumKayitDogrula(form);
  if (yerel) return { ok: false, hata: yerel };
  const { error } = await supabase.rpc('surum_politikasi_kaydet', {
    p: {
      platform: form.platform,
      latest_version: form.latestVersion.trim(),
      latest_build: BuildCoz(form.latestBuild),
      minimum_supported_version: form.minimumVersion.trim(),
      minimum_supported_build: BuildCoz(form.minimumBuild),
      force_update_enabled: form.forceUpdate,
      optional_update_enabled: form.optionalUpdate,
      update_title: form.title.trim(),
      update_message: form.message.trim(),
      button_text: form.buttonText.trim(),
      store_url: form.storeUrl.trim(),
      maintenance_message: form.maintenanceMessage.trim(),
    },
  });
  if (error) return { ok: false, hata: adminHata(error.message) };
  return { ok: true };
}

function adminHata(mesaj: string): string {
  if (mesaj.includes('STORE_URL_REQUIRED')) {
    return 'Zorunlu güncelleme açıkken geçerli bir mağaza adresi gerekli.';
  }
  if (mesaj.includes('STORE_URL_INVALID')) {
    return 'Mağaza adresi https ve ilgili mağaza alanı olmalı.';
  }
  if (mesaj.includes('INVALID_VERSION')) return 'Sürüm biçimi geçersiz. Örnek: 1.3.0';
  if (mesaj.includes('INVALID_BUILD')) return 'Build numarası geçersiz.';
  if (mesaj.includes('MINIMUM_ABOVE_LATEST')) {
    return 'Minimum sürüm, yayınlanan sürümden büyük olamaz.';
  }
  if (mesaj.includes('TEXT_REQUIRED')) return 'Başlık, mesaj ve buton metni gerekli.';
  if (mesaj.includes('Forbidden')) return 'Bu işlem için admin yetkisi gerekli.';
  return 'Kayıt tamamlanamadı.';
}
