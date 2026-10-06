import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AdminPermissionCatalogItem } from './AdminYonetimIslemleri';
import {
  AdminKategoriEtiket,
  AdminRiskEtiket,
  AdminRiskRenk,
} from './AdminYonetimUi';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

export type PermissionAccordionMode = 'select' | 'override';

type Props = {
  catalog: AdminPermissionCatalogItem[];
  selected?: string[];
  onChangeSelected?: (keys: string[]) => void;
  allows?: string[];
  denies?: string[];
  onChangeOverrides?: (next: { allows: string[]; denies: string[] }) => void;
  mode?: PermissionAccordionMode;
  roleKeys?: string[];
  disabled?: boolean;
  disabledReason?: string | null;
};

/** Efektif açık mı? ALLOW veya (rolde var ve DENY yok) */
export function permissionEfektifAcik(
  key: string,
  roleKeys: Iterable<string>,
  allows: Iterable<string>,
  denies: Iterable<string>,
): boolean {
  const deny = denies instanceof Set ? denies : new Set(denies);
  if (deny.has(key)) return false;
  const allow = allows instanceof Set ? allows : new Set(allows);
  if (allow.has(key)) return true;
  const role = roleKeys instanceof Set ? roleKeys : new Set(roleKeys);
  return role.has(key);
}

/**
 * Basit aç/kapa → ALLOW/DENY override'a çevir.
 * Açık → DENY ekle (rolde olsa bile kapatır)
 * Kapalı → DENY kaldır; rolde yoksa ALLOW ekle
 */
export function permissionToggleUygula(
  key: string,
  roleKeys: string[],
  allows: string[],
  denies: string[],
): { allows: string[]; denies: string[] } {
  const roleSet = new Set(roleKeys);
  const nextAllows = new Set(allows);
  const nextDenies = new Set(denies);
  const acik = permissionEfektifAcik(key, roleSet, nextAllows, nextDenies);

  if (acik) {
    // Kapat
    nextAllows.delete(key);
    nextDenies.add(key);
  } else {
    // Aç
    nextDenies.delete(key);
    if (roleSet.has(key)) {
      // Rolden geliyor — DENY kaldırmak yeterli
      nextAllows.delete(key);
    } else {
      nextAllows.add(key);
    }
  }

  return {
    allows: [...nextAllows],
    denies: [...nextDenies],
  };
}

export function PermissionAccordion({
  catalog,
  selected = [],
  onChangeSelected,
  allows = [],
  denies = [],
  onChangeOverrides,
  mode = 'select',
  roleKeys = [],
  disabled = false,
  disabledReason = null,
}: Props) {
  const [acikKategoriler, setAcikKategoriler] = useState<Record<string, boolean>>(
    {},
  );

  const gruplar = useMemo(() => {
    const map = new Map<string, AdminPermissionCatalogItem[]>();
    for (const item of catalog) {
      const cat = item.category || 'OTHER';
      const arr = map.get(cat) ?? [];
      arr.push(item);
      map.set(cat, arr);
    }
    return [...map.entries()].sort((a, b) =>
      AdminKategoriEtiket(a[0]).localeCompare(AdminKategoriEtiket(b[0]), 'tr'),
    );
  }, [catalog]);

  // İlk kategori varsayılan açık
  const ilkKat = gruplar[0]?.[0];

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allowSet = useMemo(() => new Set(allows), [allows]);
  const denySet = useMemo(() => new Set(denies), [denies]);
  const roleSet = useMemo(() => new Set(roleKeys), [roleKeys]);
  const tumAnahtarlar = useMemo(
    () => catalog.map((c) => c.permission_key),
    [catalog],
  );

  const kategoriAcikMi = (cat: string) => {
    if (acikKategoriler[cat] !== undefined) return acikKategoriler[cat];
    return cat === ilkKat;
  };

  const toggleKategori = (cat: string) => {
    setAcikKategoriler((prev) => ({
      ...prev,
      [cat]: !kategoriAcikMi(cat),
    }));
  };

  const setSelected = (keys: string[]) => onChangeSelected?.(keys);

  const toggleSelect = (key: string) => {
    if (disabled || mode !== 'select') return;
    const next = new Set(selectedSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected([...next]);
  };

  const kategoriSec = (keys: string[]) => {
    if (disabled || mode !== 'select') return;
    const next = new Set(selectedSet);
    for (const k of keys) next.add(k);
    setSelected([...next]);
  };

  const kategoriTemizle = (keys: string[]) => {
    if (disabled || mode !== 'select') return;
    const drop = new Set(keys);
    setSelected(selected.filter((k) => !drop.has(k)));
  };

  const toggleOverride = (key: string) => {
    if (disabled || mode !== 'override') return;
    const next = permissionToggleUygula(key, roleKeys, allows, denies);
    onChangeOverrides?.(next);
  };

  const kategoriHepsiAc = (keys: string[]) => {
    if (disabled || mode !== 'override') return;
    let nextAllows = [...allows];
    let nextDenies = [...denies];
    for (const key of keys) {
      if (!permissionEfektifAcik(key, roleKeys, nextAllows, nextDenies)) {
        const r = permissionToggleUygula(key, roleKeys, nextAllows, nextDenies);
        nextAllows = r.allows;
        nextDenies = r.denies;
      }
    }
    onChangeOverrides?.({ allows: nextAllows, denies: nextDenies });
  };

  const kategoriHepsiKapat = (keys: string[]) => {
    if (disabled || mode !== 'override') return;
    let nextAllows = [...allows];
    let nextDenies = [...denies];
    for (const key of keys) {
      if (permissionEfektifAcik(key, roleKeys, nextAllows, nextDenies)) {
        const r = permissionToggleUygula(key, roleKeys, nextAllows, nextDenies);
        nextAllows = r.allows;
        nextDenies = r.denies;
      }
    }
    onChangeOverrides?.({ allows: nextAllows, denies: nextDenies });
  };

  const efektifAcikSay = (keys: string[]) =>
    keys.filter((k) =>
      permissionEfektifAcik(k, roleSet, allowSet, denySet),
    ).length;

  return (
    <View style={styles.wrap}>
      {disabled && disabledReason ? (
        <View style={styles.kilitKart}>
          <Ionicons name="lock-closed" size={18} color={RenkTokenlari.warning} />
          <Text style={styles.kilitText}>{disabledReason}</Text>
        </View>
      ) : null}

      {mode === 'select' ? (
        <View style={styles.toolbar}>
          <View style={styles.toolbarSol}>
            <Pressable
              style={[styles.toolBtn, styles.toolBtnPrimary]}
              disabled={disabled}
              onPress={() => setSelected(tumAnahtarlar)}
            >
              <Ionicons name="checkbox" size={14} color={RenkTokenlari.primarySoft} />
              <Text style={styles.toolBtnPrimaryText}>Tümünü aç</Text>
            </Pressable>
            <Pressable
              style={styles.toolBtn}
              disabled={disabled}
              onPress={() => setSelected([])}
            >
              <Text style={styles.toolBtnText}>Tümünü kapat</Text>
            </Pressable>
          </View>
          <Text style={styles.sayac}>
            <Text style={styles.sayacN}>{selected.length}</Text>
            <Text style={styles.sayacL}> / {tumAnahtarlar.length}</Text>
          </Text>
        </View>
      ) : !disabled ? (
        <View style={styles.ipucuKart}>
          <Ionicons name="toggle" size={18} color={RenkTokenlari.primarySoft} />
          <Text style={styles.ipucuText}>
            Anahtara dokun: yetkiyi aç veya kapat. Değişiklikler “Kaydet”e basınca
            uygulanır.
          </Text>
          <Pressable
            style={styles.toolBtn}
            onPress={() => onChangeOverrides?.({ allows: [], denies: [] })}
          >
            <Text style={styles.toolBtnText}>Değişiklikleri sıfırla</Text>
          </Pressable>
        </View>
      ) : null}

      {gruplar.map(([cat, items]) => {
        const open = kategoriAcikMi(cat);
        const keys = items.map((i) => i.permission_key);
        const acikAdet =
          mode === 'select'
            ? keys.filter((k) => selectedSet.has(k)).length
            : efektifAcikSay(keys);
        const dolu = acikAdet > 0;

        return (
          <View key={cat} style={[styles.kategori, open && styles.kategoriAcik]}>
            <Pressable
              style={styles.kategoriBaslik}
              onPress={() => toggleKategori(cat)}
            >
              <View
                style={[
                  styles.katIcon,
                  {
                    backgroundColor: dolu
                      ? 'rgba(232,64,145,0.14)'
                      : RenkTokenlari.surface,
                  },
                ]}
              >
                <Ionicons
                  name={open ? 'folder-open' : 'folder'}
                  size={16}
                  color={dolu ? RenkTokenlari.primarySoft : RenkTokenlari.textMuted}
                />
              </View>
              <View style={styles.katBaslikGovde}>
                <Text style={styles.kategoriAd}>{AdminKategoriEtiket(cat)}</Text>
                <Text style={styles.kategoriAlt}>
                  {acikAdet} / {items.length} açık
                </Text>
              </View>
              <Ionicons
                name={open ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={RenkTokenlari.textDim}
              />
            </Pressable>

            {open ? (
              <View style={styles.katAksiyon}>
                {mode === 'select' ? (
                  <>
                    <Pressable
                      style={styles.miniBtn}
                      disabled={disabled}
                      onPress={() => kategoriSec(keys)}
                    >
                      <Text style={styles.miniBtnText}>Grubu aç</Text>
                    </Pressable>
                    <Pressable
                      style={styles.miniBtn}
                      disabled={disabled}
                      onPress={() => kategoriTemizle(keys)}
                    >
                      <Text style={styles.miniBtnText}>Grubu kapat</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      style={styles.miniBtn}
                      disabled={disabled}
                      onPress={() => kategoriHepsiAc(keys)}
                    >
                      <Text style={styles.miniBtnText}>Grubu aç</Text>
                    </Pressable>
                    <Pressable
                      style={styles.miniBtn}
                      disabled={disabled}
                      onPress={() => kategoriHepsiKapat(keys)}
                    >
                      <Text style={styles.miniBtnText}>Grubu kapat</Text>
                    </Pressable>
                  </>
                )}
              </View>
            ) : null}

            {open
              ? items.map((item) => {
                  const riskColor = AdminRiskRenk(item.risk);
                  const key = item.permission_key;

                  if (mode === 'select') {
                    const checked = selectedSet.has(key);
                    return (
                      <View
                        key={key}
                        style={[styles.satir, checked && styles.satirAcik]}
                      >
                        <Pressable
                          style={styles.satirGovde}
                          disabled={disabled}
                          onPress={() => toggleSelect(key)}
                        >
                          <Text style={styles.satirLabel}>{item.label}</Text>
                          {item.description ? (
                            <Text style={styles.satirDesc} numberOfLines={1}>
                              {item.description}
                            </Text>
                          ) : null}
                        </Pressable>
                        <View
                          style={[
                            styles.riskPill,
                            { backgroundColor: `${riskColor}22` },
                          ]}
                        >
                          <Text style={[styles.riskText, { color: riskColor }]}>
                            {AdminRiskEtiket(item.risk)}
                          </Text>
                        </View>
                        <Switch
                          value={checked}
                          disabled={disabled}
                          onValueChange={() => toggleSelect(key)}
                          trackColor={{
                            false: RenkTokenlari.border,
                            true: 'rgba(232,64,145,0.55)',
                          }}
                          thumbColor={
                            checked
                              ? RenkTokenlari.primarySoft
                              : RenkTokenlari.textDim
                          }
                        />
                      </View>
                    );
                  }

                  const acik = permissionEfektifAcik(
                    key,
                    roleSet,
                    allowSet,
                    denySet,
                  );
                  const kaynaktan =
                    denySet.has(key)
                      ? 'Kapalı (özel)'
                      : allowSet.has(key)
                        ? 'Açık (özel)'
                        : roleSet.has(key)
                          ? 'Açık (rol)'
                          : 'Kapalı';

                  return (
                    <View
                      key={key}
                      style={[styles.satir, acik && styles.satirAcik]}
                    >
                      <Pressable
                        style={styles.satirGovde}
                        disabled={disabled}
                        onPress={() => toggleOverride(key)}
                      >
                        <Text style={styles.satirLabel}>{item.label}</Text>
                        <Text
                          style={[
                            styles.satirDesc,
                            {
                              color: acik
                                ? RenkTokenlari.mint
                                : RenkTokenlari.textDim,
                            },
                          ]}
                        >
                          {kaynaktan}
                        </Text>
                      </Pressable>
                      <View
                        style={[
                          styles.riskPill,
                          { backgroundColor: `${riskColor}22` },
                        ]}
                      >
                        <Text style={[styles.riskText, { color: riskColor }]}>
                          {AdminRiskEtiket(item.risk)}
                        </Text>
                      </View>
                      <Switch
                        value={acik}
                        disabled={disabled}
                        onValueChange={() => toggleOverride(key)}
                        trackColor={{
                          false: RenkTokenlari.border,
                          true: 'rgba(46,204,113,0.45)',
                        }}
                        thumbColor={
                          acik ? RenkTokenlari.mint : RenkTokenlari.textDim
                        }
                      />
                    </View>
                  );
                })
              : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  kilitKart: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: `${RenkTokenlari.warning}66`,
    backgroundColor: `${RenkTokenlari.warning}18`,
  },
  kilitText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    flex: 1,
    lineHeight: 18,
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  toolbarSol: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
  toolBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  toolBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderColor: 'rgba(232,64,145,0.35)',
    backgroundColor: 'rgba(232,64,145,0.1)',
  },
  toolBtnText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  toolBtnPrimaryText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
  },
  sayac: { ...TipografiTokenlari.caption },
  sayacN: { color: RenkTokenlari.text, fontWeight: '800', fontSize: 16 },
  sayacL: { color: RenkTokenlari.textDim, fontWeight: '600' },
  ipucuKart: {
    gap: 8,
    padding: 12,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: 'rgba(232,64,145,0.25)',
    backgroundColor: 'rgba(232,64,145,0.08)',
  },
  ipucuText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 18,
  },
  kategori: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.bgCard,
    overflow: 'hidden',
  },
  kategoriAcik: {
    borderColor: 'rgba(232,64,145,0.28)',
  },
  kategoriBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  katIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  katBaslikGovde: { flex: 1, gap: 2 },
  kategoriAd: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
    fontSize: 15,
  },
  kategoriAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  katAksiyon: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  miniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: RenkTokenlari.surface,
  },
  miniBtnText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.border,
  },
  satirAcik: {
    backgroundColor: 'rgba(46,204,113,0.06)',
  },
  satirGovde: { flex: 1, gap: 2 },
  satirLabel: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  satirDesc: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  riskPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  riskText: {
    ...TipografiTokenlari.micro,
    fontWeight: '800',
    fontSize: 10,
  },
});
