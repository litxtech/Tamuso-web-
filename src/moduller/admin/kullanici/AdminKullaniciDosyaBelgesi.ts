import type { BelgeIcerik } from '../../belge-paylasim/BelgeSablonlari';
import { LedgerSebepEtiketi } from '../../cuzdan/okuma/CuzdanLedgeriniGetir';
import { AdminLogAnlasilirMetin } from './AdminLogAnlasilirMetin';
import { OrtamDegiskenleri } from '../../../yapilandirma/OrtamDegiskenleri';
import type { AdminKullaniciDosyasi } from './tipler';

function trTarih(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('tr-TR');
  } catch {
    return iso;
  }
}

function olayEtiket(kod: string): string {
  const map: Record<string, string> = {
    account_banned: 'Hesap banlandı',
    account_admin_deleted: 'Admin silme',
    account_delete_requested: 'Kullanıcı silme isteği',
    user_warning: 'İhtar',
    login: 'Giriş',
    logout: 'Çıkış',
  };
  return map[kod] ?? kod.replace(/_/g, ' ');
}

/** Admin kullanıcı dosyası → modern PDF belgesi */
export function AdminKullaniciDosyaBelgesiOlustur(
  dosya: AdminKullaniciDosyasi,
): BelgeIcerik {
  const p = dosya.profil;
  const ad =
    p.display_name ?? (p.username ? `@${p.username}` : p.id.slice(0, 8));

  const durum = p.deleted_at
    ? 'Silinmiş'
    : p.banned_at
      ? `Banlı (${p.ban_reason ?? 'sebep yok'})`
      : 'Aktif';

  const hareketSatirlari = (dosya.hareketler ?? []).slice(0, 25).map((h) => ({
    etiket: `${trTarih(h.created_at)} · ${LedgerSebepEtiketi(h.reason)}`,
    deger: `${h.delta >= 0 ? '+' : ''}${h.delta} ${h.currency} → ${h.balance_after}`,
  }));

  const hediyeSatirlari = (dosya.hediye_akis ?? []).slice(0, 15).map((h) => ({
    etiket: `${trTarih(h.created_at)} · ${h.yon === 'gonderilen' ? '→' : '←'} ${h.karsi_ad}`,
    deger:
      h.yon === 'gonderilen'
        ? `−${h.coins_spent} coin`
        : `+${h.diamonds_earned} elmas`,
  }));

  const logSatirlari = [
    ...(dosya.admin_loglari ?? []).slice(0, 12).map((l) => ({
      etiket: `${trTarih(l.created_at)} · Yönetim`,
      deger: AdminLogAnlasilirMetin(l.action, l.summary),
    })),
    ...(dosya.guvenlik_olaylari ?? []).slice(0, 12).map((l) => ({
      etiket: `${trTarih(l.created_at)} · Güvenlik`,
      deger: olayEtiket(l.event_type),
    })),
  ];

  return {
    platformAdi: OrtamDegiskenleri.uygulamaAdi,
    baslik: 'Kullanıcı dosyası',
    altBaslik: `${ad} · ${p.public_user_id ?? p.id.slice(0, 8)}`,
    ozet: `Durum: ${durum} · Risk: ${dosya.risk.seviye.toUpperCase()} (${dosya.risk.skor}/100) · İade riski: ${dosya.risk.iade_riski_var ? 'VAR' : 'YOK'}`,
    bolumler: [
      {
        baslik: 'Kimlik',
        satirlar: [
          { etiket: 'Görünen ad', deger: p.display_name ?? '—' },
          { etiket: 'Kullanıcı adı', deger: p.username ? `@${p.username}` : '—' },
          { etiket: 'Public ID', deger: p.public_user_id ?? '—' },
          { etiket: 'Telefon', deger: p.phone_e164 ?? '—' },
          { etiket: 'Hesap açılışı', deger: trTarih(p.created_at) },
          { etiket: 'Ülke / dil', deger: `${p.country ?? '—'} / ${p.language ?? '—'}` },
          {
            etiket: 'Rol',
            deger: [
              p.is_admin ? 'Admin' : null,
              p.is_host ? 'Ev sahibi' : null,
              p.is_guest ? 'Misafir' : null,
              p.is_verified ? 'Doğrulanmış' : null,
            ]
              .filter(Boolean)
              .join(', ') || 'Kullanıcı',
          },
        ],
      },
      {
        baslik: 'Cüzdan & yükleme',
        satirlar: [
          { etiket: 'Coin bakiyesi', deger: String(dosya.cuzdan.coins) },
          { etiket: 'Elmas bakiyesi', deger: String(dosya.cuzdan.diamonds) },
          {
            etiket: 'Toplam yükleme',
            deger: `${dosya.yukleme.toplam_coin} coin (${dosya.yukleme.adet} işlem)`,
          },
          {
            etiket: 'İlk yükleme',
            deger: dosya.yukleme.ilk
              ? `${trTarih(dosya.yukleme.ilk.tarih)} · ${dosya.yukleme.ilk.coin} coin · ${dosya.yukleme.ilk.kaynak}`
              : 'Henüz yok',
          },
        ],
      },
      {
        baslik: 'Hediye trafiği',
        satirlar: [
          {
            etiket: 'Gönderilen',
            deger: `${dosya.hediye.gonderilen_adet} adet · ${dosya.hediye.gonderilen_coin} coin`,
          },
          {
            etiket: 'Alınan',
            deger: `${dosya.hediye.alinan_adet} adet · ${dosya.hediye.alinan_elmas} elmas`,
          },
          ...hediyeSatirlari,
        ],
      },
      {
        baslik: 'Cihaz & süre',
        ozet: `Tahmini uygulamada kalma: ${dosya.oturum.tahmini_aktif_metin}`,
        satirlar: [
          { etiket: 'Platformlar', deger: dosya.oturum.platformlar },
          ...(dosya.oturum.cihazlar ?? []).slice(0, 8).map((c) => ({
            etiket: `${(c.platform ?? '?').toUpperCase()} · ${c.model ?? 'cihaz'}`,
            deger: `${c.sure_metin} · son ${trTarih(c.son_gorulme)}${c.iptal ? ' · iptal' : ''}`,
          })),
        ],
      },
      {
        baslik: 'İhtar & risk',
        satirlar: [
          { etiket: 'Aktif ihtar', deger: String(dosya.ihtar.aktif_adet) },
          {
            etiket: 'İade riski',
            deger: dosya.risk.iade_riski_var
              ? `VAR · ${dosya.risk.seviye} (${dosya.risk.skor})`
              : `Yok · ${dosya.risk.seviye} (${dosya.risk.skor})`,
          },
          {
            etiket: 'Risk notları',
            deger: (dosya.risk.notlar ?? []).join(' · ') || '—',
          },
          {
            etiket: 'Açık rapor / iade',
            deger: `${dosya.risk.acik_rapor} rapor · ${dosya.risk.iade_adet} iade`,
          },
          {
            etiket: 'Bekleyen çekim',
            deger: `${dosya.risk.bekleyen_cekim_elmas} elmas`,
          },
          ...(dosya.ihtar.liste ?? [])
            .filter((i) => i.is_active)
            .slice(0, 8)
            .map((i) => ({
              etiket: `${trTarih(i.created_at)} · ${i.severity}`,
              deger: i.reason,
            })),
        ],
      },
      {
        baslik: 'Cüzdan hareketleri',
        satirlar:
          hareketSatirlari.length > 0
            ? hareketSatirlari
            : [{ etiket: 'Hareket', deger: 'Kayıt yok' }],
      },
      {
        baslik: 'Anlaşılır loglar',
        satirlar:
          logSatirlari.length > 0
            ? logSatirlari
            : [{ etiket: 'Log', deger: 'Kayıt yok' }],
      },
    ],
    not: `${OrtamDegiskenleri.uygulamaAdi} yönetim paneli kullanıcı dosyası. Gizli veri içerir — yetkisiz paylaşmayın.`,
  };
}
