import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

export type PayOranlari = {
  host: number;
  ajans: number;
  platform: number;
};

/** 0–100 yüzde değerleri; toplamı normalize etmez, sadece gösterir. */
export function KomisyonPayCubugu({
  host,
  ajans,
  platform,
  ornekElmas = 1000,
}: PayOranlari & { ornekElmas?: number }) {
  const safe = useMemo(() => {
    const h = Math.max(0, Number(host) || 0);
    const a = Math.max(0, Number(ajans) || 0);
    const p = Math.max(0, Number(platform) || 0);
    const t = h + a + p;
    return {
      h,
      a,
      p,
      t,
      ok: t > 0 && Math.abs(t - 100) < 0.15,
      hostElmas: Math.floor((ornekElmas * h) / 100),
      ajansElmas: Math.floor((ornekElmas * a) / 100),
      platformElmas: Math.floor((ornekElmas * p) / 100),
    };
  }, [host, ajans, platform, ornekElmas]);

  const w = (n: number) =>
    safe.t > 0 ? `${Math.max(2, (n / Math.max(safe.t, 100)) * 100)}%` : '33%';

  return (
    <View style={s.wrap}>
      <View style={s.bar}>
        <View
          style={[
            s.seg,
            { width: w(safe.h) as `${number}%`, backgroundColor: RenkTokenlari.mint },
          ]}
        />
        <View
          style={[
            s.seg,
            {
              width: w(safe.a) as `${number}%`,
              backgroundColor: RenkTokenlari.primarySoft,
            },
          ]}
        />
        <View
          style={[
            s.seg,
            {
              width: w(safe.p) as `${number}%`,
              backgroundColor: RenkTokenlari.violet,
            },
          ]}
        />
      </View>

      <View style={s.legend}>
        <LegendDot
          color={RenkTokenlari.mint}
          label="Yayıncı (host)"
          pct={safe.h}
          ornek={safe.hostElmas}
        />
        <LegendDot
          color={RenkTokenlari.primarySoft}
          label="Ajans"
          pct={safe.a}
          ornek={safe.ajansElmas}
        />
        <LegendDot
          color={RenkTokenlari.violet}
          label="Platform"
          pct={safe.p}
          ornek={safe.platformElmas}
        />
      </View>

      <Text style={s.ornek}>
        Örnek: {ornekElmas.toLocaleString('tr-TR')} elmas hediyede → yayıncı{' '}
        {safe.hostElmas.toLocaleString('tr-TR')} · ajans{' '}
        {safe.ajansElmas.toLocaleString('tr-TR')} · platform{' '}
        {safe.platformElmas.toLocaleString('tr-TR')}
      </Text>
      {!safe.ok ? (
        <Text style={s.warn}>Toplam %{safe.t.toFixed(1)} — %100 olmalı</Text>
      ) : null}
    </View>
  );
}

function LegendDot({
  color,
  label,
  pct,
  ornek,
}: {
  color: string;
  label: string;
  pct: number;
  ornek: number;
}) {
  return (
    <View style={s.legItem}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.legLabel}>{label}</Text>
        <Text style={s.legVal}>
          %{Number(pct).toFixed(pct % 1 ? 1 : 0)} · {ornek.toLocaleString('tr-TR')} elmas
        </Text>
      </View>
    </View>
  );
}

export function KomisyonNasilCalisir() {
  return (
    <View style={s.nasil}>
      <Text style={s.nasilBaslik}>Nasıl çalışır?</Text>
      <Text style={s.nasilMadde}>
        1. Kullanıcı hediye gönderince host elmas kazanır.
      </Text>
      <Text style={s.nasilMadde}>
        2. Host ajansa bağlıysa elmas bu oranlara göre bölünür.
      </Text>
      <Text style={s.nasilMadde}>
        3. Yayıncı payı otomatik: 100 − ajans − platform.
      </Text>
      <Text style={s.nasilMadde}>
        4. “Varsayılan” yalnızca yeni açılan ajanslar içindir. Mevcut ajansları
        değiştirmek için listeden düzenle veya “Tümüne uygula” kullan.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    gap: BoslukTokenlari.sm,
  },
  bar: {
    height: 14,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: RenkTokenlari.surface,
  },
  seg: {
    height: '100%',
  },
  legend: {
    gap: 8,
  },
  legItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legLabel: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  legVal: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  ornek: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    lineHeight: 16,
  },
  warn: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.danger,
    fontWeight: '700',
  },
  nasil: {
    gap: 6,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgElevated,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
  },
  nasilBaslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  nasilMadde: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 20,
  },
});
