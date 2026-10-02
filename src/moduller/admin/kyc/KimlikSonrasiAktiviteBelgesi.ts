import type { BelgeIcerik } from '../../belge-paylasim/BelgeSablonlari';
import { LedgerBirimEtiketi, LedgerSebepEtiketi } from '../../cuzdan/okuma/CuzdanLedgeriniGetir';
import type { AdminKullaniciDosyasi } from '../kullanici/tipler';
import { AdminLogAnlasilirMetin } from '../kullanici/AdminLogAnlasilirMetin';
import { OrtamDegiskenleri } from '../../../yapilandirma/OrtamDegiskenleri';
import type { AdminKycBasvuru } from './AdminKycIslemleri';

function trTarih(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('tr-TR');
  } catch {
    return iso;
  }
}

export function magazaEtiketi(kaynak?: string | null): string {
  const k = (kaynak ?? '').toLowerCase();
  if (k.includes('apple') || k === 'ios' || k === 'app_store') return 'App Store';
  if (k.includes('google') || k.includes('play')) return 'Play Store';
  if (k.includes('stripe')) return 'Stripe';
  return kaynak?.trim() || '—';
}

export function odemeDurumEtiketi(status?: string | null): string {
  const map: Record<string, string> = {
    completed: 'Tamamlandı',
    complete: 'Tamamlandı',
    succeeded: 'Tamamlandı',
    paid: 'Ödendi',
    pending: 'Bekliyor',
    processing: 'İşleniyor',
    failed: 'Başarısız',
    refunded: 'İade edildi',
    cancelled: 'İptal',
    canceled: 'İptal',
  };
  const k = (status ?? '').toLowerCase();
  return map[k] ?? (status?.trim() || '—');
}

type Girdi = {
  basvuru: AdminKycBasvuru;
  ad: string;
  yuklemeler: AdminKullaniciDosyasi['yuklemeler'];
  hareketler: AdminKullaniciDosyasi['hareketler'];
  hediyeler: AdminKullaniciDosyasi['hediye_akis'];
  loglar: AdminKullaniciDosyasi['admin_loglari'];
};

export function KimlikSonrasiAktiviteBelgesiOlustur(girdi: Girdi): BelgeIcerik {
  const b = girdi.basvuru;
  return {
    platformAdi: OrtamDegiskenleri.uygulamaAdi,
    baslik: 'Kimlik sonrası aktivite',
    altBaslik: `${b.first_name} ${b.last_name} · ${girdi.ad}`,
    ozet: `Başvuru: ${trTarih(b.created_at)}. Bu belgede yalnızca bu tarihten sonraki hareketler vardır.`,
    bolumler: [
      {
        baslik: 'Yüklemeler',
        satirlar:
          girdi.yuklemeler.length > 0
            ? girdi.yuklemeler.slice(0, 20).map((y) => ({
                etiket: trTarih(y.tarih),
                deger: `${y.coin.toLocaleString('tr-TR')} coin · ${magazaEtiketi(y.store ?? y.provider)} · ${odemeDurumEtiketi(y.status)}`,
              }))
            : [{ etiket: 'Kayıt', deger: 'Yükleme yok' }],
      },
      {
        baslik: 'Cüzdan hareketleri',
        satirlar:
          girdi.hareketler.length > 0
            ? girdi.hareketler.slice(0, 30).map((h) => ({
                etiket: trTarih(h.created_at),
                deger: `${h.delta > 0 ? '+' : ''}${h.delta.toLocaleString('tr-TR')} ${LedgerBirimEtiketi(h.currency)} · ${LedgerSebepEtiketi(h.reason)} · bakiye ${h.balance_after.toLocaleString('tr-TR')}`,
              }))
            : [{ etiket: 'Kayıt', deger: 'Hareket yok' }],
      },
      {
        baslik: 'Hediyeler',
        satirlar:
          girdi.hediyeler.length > 0
            ? girdi.hediyeler.slice(0, 20).map((h) => ({
                etiket: `${h.yon === 'gonderilen' ? 'Gönderilen' : 'Alınan'} · ${h.karsi_ad}`,
                deger:
                  h.yon === 'gonderilen'
                    ? `${h.coins_spent.toLocaleString('tr-TR')} coin harcandı · ${trTarih(h.created_at)}`
                    : `${h.diamonds_earned.toLocaleString('tr-TR')} elmas kazanıldı · ${trTarih(h.created_at)}`,
              }))
            : [{ etiket: 'Kayıt', deger: 'Hediye yok' }],
      },
      {
        baslik: 'Yönetim logları',
        satirlar:
          girdi.loglar.length > 0
            ? girdi.loglar.slice(0, 20).map((l) => ({
                etiket: trTarih(l.created_at),
                deger: AdminLogAnlasilirMetin(l.action, l.summary),
              }))
            : [{ etiket: 'Kayıt', deger: 'Log yok' }],
      },
    ],
    not: `${OrtamDegiskenleri.uygulamaAdi} kimlik inceleme belgesi. Kimlik fotoğrafları bu dosyada yer almaz.`,
  };
}
