/**
 * SesOdasiMikrofonDuzeni — seçilen görünüm düzenine göre premium sahne.
 * 12+ / 16+ koltukta otomatik yoğun salon (Bigo/YoYo tarzı) — kaydırmadan hepsi görünür.
 */

import React, { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { RoomSeat } from '../../../types/models';
import {
  OdaDuzeniniCoz,
  type OdaDuzenTanim,
} from '../duzen/OdaDuzeniniCoz';
import { KonusmaciKarti } from './KonusmaciKarti';

type Props = {
  seats: RoomSeat[];
  hostId?: string | null;
  layoutCode?: string | null;
  onSeatPress?: (seat: RoomSeat) => void;
  onSeatLongPress?: (seat: RoomSeat) => void;
};

/** Koltuk sayısına göre yoğunluk — büyük sahnelerde satır yüksekliğini düşür */
function yogunlukSeviyesi(adet: number): 'normal' | 'orta' | 'yogun' {
  if (adet >= 16) return 'yogun';
  if (adet >= 12) return 'orta';
  return 'normal';
}

function duzeniYogunlastir(
  duzen: OdaDuzenTanim,
  seviye: 'normal' | 'orta' | 'yogun',
): OdaDuzenTanim {
  if (seviye === 'yogun') {
    return {
      ...duzen,
      kolon: 5,
      koltukOlcek: 'mikro',
      tahtOlcek: 'normal',
      halo: false,
      sahneOdakli: true,
    };
  }
  if (seviye === 'orta') {
    return {
      ...duzen,
      kolon: Math.max(duzen.kolon, 4),
      koltukOlcek: 'kompakt',
      tahtOlcek: duzen.tahtOlcek === 'dev' ? 'buyuk' : duzen.tahtOlcek,
      halo: false,
    };
  }
  return duzen;
}

function orbitOffset(index: number, total: number): number {
  if (total <= 1) return 0;
  const mid = (total - 1) / 2;
  const t = (index - mid) / Math.max(mid, 1);
  return Math.round((1 - t * t) * 18);
}

function cascadeOffset(index: number, kolon: number): number {
  const row = Math.floor(index / kolon);
  return row % 2 === 1 ? 14 : 0;
}

function diamondRowWidths(count: number): number[] {
  if (count <= 0) return [];
  if (count <= 2) return [count];
  if (count <= 5) return [2, count - 2];
  if (count <= 8) return [2, 3, count - 5];
  const rows: number[] = [2, 3, 4];
  let left = count - 9;
  while (left > 0) {
    const n = Math.min(4, left);
    rows.push(n);
    left -= n;
  }
  return rows;
}

function TahtSatiri({
  taht,
  hostId,
  duzen,
  yanlar,
  yogun,
  onSeatPress,
  onSeatLongPress,
}: {
  taht: RoomSeat | null;
  hostId?: string | null;
  duzen: OdaDuzenTanim;
  yanlar?: RoomSeat[];
  yogun?: boolean;
  onSeatPress?: (seat: RoomSeat) => void;
  onSeatLongPress?: (seat: RoomSeat) => void;
}) {
  const yan = yanlar?.slice(0, 2) ?? [];
  const tahtOlcek = yogun
    ? 'buyuk'
    : duzen.tahtOlcek === 'normal'
      ? 'buyuk'
      : 'dev';
  return (
    <View
      style={[
        styles.tahtBolum,
        !yogun && duzen.tahtOlcek === 'dev' && styles.tahtBolumDev,
        !yogun && duzen.sahneOdakli && styles.tahtBolumOdak,
        yogun && styles.tahtBolumYogun,
      ]}
    >
      {yan[0] ? (
        <View style={[styles.tahtYan, yogun && styles.tahtYanYogun]}>
          <KonusmaciKarti
            seat={yan[0]}
            hostId={hostId}
            olcek={duzen.koltukOlcek}
            halo={!yogun && duzen.halo}
            yogun={yogun}
            onPress={onSeatPress}
            onLongPress={onSeatLongPress}
          />
        </View>
      ) : !yogun && duzen.varyant === 'arena' ? (
        <View style={styles.tahtYanBos} />
      ) : null}

      <View
        style={[
          styles.tahtKartWrap,
          !yogun && duzen.tahtOlcek === 'buyuk' && styles.tahtKartBuyuk,
          !yogun && duzen.tahtOlcek === 'dev' && styles.tahtKartDev,
          yogun && styles.tahtKartYogun,
        ]}
      >
        {taht ? (
          <KonusmaciKarti
            seat={taht}
            hostId={hostId}
            tahtMi
            olcek={tahtOlcek}
            halo={!yogun && duzen.halo}
            yogun={yogun}
            onPress={onSeatPress}
            onLongPress={onSeatLongPress}
          />
        ) : (
          <View
            style={[
              styles.tahtBosPlaceholder,
              !yogun && duzen.tahtOlcek === 'dev' && styles.tahtBosDev,
              yogun && styles.tahtBosYogun,
            ]}
          />
        )}
      </View>

      {yan[1] ? (
        <View style={[styles.tahtYan, yogun && styles.tahtYanYogun]}>
          <KonusmaciKarti
            seat={yan[1]}
            hostId={hostId}
            olcek={duzen.koltukOlcek}
            halo={!yogun && duzen.halo}
            yogun={yogun}
            onPress={onSeatPress}
            onLongPress={onSeatLongPress}
          />
        </View>
      ) : !yogun && duzen.varyant === 'arena' ? (
        <View style={styles.tahtYanBos} />
      ) : null}
    </View>
  );
}

function IzgaraSatirlari({
  seats,
  hostId,
  duzen,
  onSeatPress,
  onSeatLongPress,
  offsetFn,
  yogun,
}: {
  seats: RoomSeat[];
  hostId?: string | null;
  duzen: OdaDuzenTanim;
  onSeatPress?: (seat: RoomSeat) => void;
  onSeatLongPress?: (seat: RoomSeat) => void;
  offsetFn?: (index: number) => number;
  yogun?: boolean;
}) {
  const kolon = Math.min(Math.max(duzen.kolon, 2), 5);
  const gap = yogun
    ? 2
    : duzen.koltukOlcek === 'buyuk'
      ? 6
      : duzen.koltukOlcek === 'kompakt' || duzen.koltukOlcek === 'mikro'
        ? 4
        : 5;
  const kartOlcek = duzen.koltukOlcek;

  const satirlar: RoomSeat[][] = [];
  for (let i = 0; i < seats.length; i += kolon) {
    satirlar.push(seats.slice(i, i + kolon));
  }

  return (
    <View style={[styles.gridKok, { gap }, yogun && styles.gridKokYogun]}>
      {satirlar.map((satir, ri) => (
        <View key={`satir-${ri}`} style={[styles.gridSatir, { gap }]}>
          {satir.map((seat, ci) => {
            const i = ri * kolon + ci;
            return (
              <View
                key={seat.id}
                style={[
                  styles.hucre,
                  yogun && styles.hucreYogun,
                  {
                    flex: 1,
                    maxWidth: `${100 / kolon}%`,
                    marginTop: yogun ? 0 : offsetFn ? offsetFn(i) : 0,
                  },
                ]}
              >
                <KonusmaciKarti
                  seat={seat}
                  hostId={hostId}
                  olcek={kartOlcek}
                  halo={!yogun && duzen.halo}
                  yogun={yogun}
                  onPress={onSeatPress}
            onLongPress={onSeatLongPress}
                />
              </View>
            );
          })}
          {satir.length < kolon
            ? Array.from({ length: kolon - satir.length }).map((_, j) => (
                <View
                  key={`pad-${ri}-${j}`}
                  style={{ flex: 1, maxWidth: `${100 / kolon}%` }}
                />
              ))
            : null}
        </View>
      ))}
    </View>
  );
}

function DiamondIzgara({
  seats,
  hostId,
  duzen,
  onSeatPress,
  onSeatLongPress,
}: {
  seats: RoomSeat[];
  hostId?: string | null;
  duzen: OdaDuzenTanim;
  onSeatPress?: (seat: RoomSeat) => void;
  onSeatLongPress?: (seat: RoomSeat) => void;
}) {
  const rows = useMemo(() => {
    const widths = diamondRowWidths(seats.length);
    const out: RoomSeat[][] = [];
    let cursor = 0;
    for (const w of widths) {
      out.push(seats.slice(cursor, cursor + w));
      cursor += w;
    }
    return out;
  }, [seats]);

  return (
    <View style={styles.diamondKok}>
      {rows.map((row, ri) => (
        <View key={`d-${ri}`} style={styles.diamondSatir}>
          {row.map((seat) => (
            <View key={seat.id} style={styles.diamondHucre}>
              <KonusmaciKarti
                seat={seat}
                hostId={hostId}
                olcek={duzen.koltukOlcek}
                halo={duzen.halo}
                onPress={onSeatPress}
            onLongPress={onSeatLongPress}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function ArenaDuzen({
  taht,
  diger,
  hostId,
  duzen,
  onSeatPress,
  onSeatLongPress,
}: {
  taht: RoomSeat | null;
  diger: RoomSeat[];
  hostId?: string | null;
  duzen: OdaDuzenTanim;
  onSeatPress?: (seat: RoomSeat) => void;
  onSeatLongPress?: (seat: RoomSeat) => void;
}) {
  const mid = Math.ceil(diger.length / 2);
  const sol = diger.slice(0, mid);
  const sag = diger.slice(mid);

  return (
    <View style={styles.arenaKok}>
      <View style={styles.arenaKolon}>
        {sol.map((seat) => (
          <KonusmaciKarti
            key={seat.id}
            seat={seat}
            hostId={hostId}
            olcek={duzen.koltukOlcek}
            halo={duzen.halo}
            onPress={onSeatPress}
            onLongPress={onSeatLongPress}
          />
        ))}
      </View>
      <View style={styles.arenaMerkez}>
        <TahtSatiri taht={taht} hostId={hostId} duzen={duzen} onSeatPress={onSeatPress}
              onSeatLongPress={onSeatLongPress} />
      </View>
      <View style={styles.arenaKolon}>
        {sag.map((seat) => (
          <KonusmaciKarti
            key={seat.id}
            seat={seat}
            hostId={hostId}
            olcek={duzen.koltukOlcek}
            halo={duzen.halo}
            onPress={onSeatPress}
            onLongPress={onSeatLongPress}
          />
        ))}
      </View>
    </View>
  );
}

function VipRay({
  seats,
  hostId,
  duzen,
  onSeatPress,
  onSeatLongPress,
}: {
  seats: RoomSeat[];
  hostId?: string | null;
  duzen: OdaDuzenTanim;
  onSeatPress?: (seat: RoomSeat) => void;
  onSeatLongPress?: (seat: RoomSeat) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.vipRay}
    >
      {seats.map((seat) => (
        <View key={seat.id} style={styles.vipHucre}>
          <KonusmaciKarti
            seat={seat}
            hostId={hostId}
            olcek={duzen.koltukOlcek}
            halo={duzen.halo}
            onPress={onSeatPress}
            onLongPress={onSeatLongPress}
          />
        </View>
      ))}
    </ScrollView>
  );
}

/** Üstte sahip tahtı, altta seçilen görünüme göre mikrofon sahnesi */
function SesOdasiMikrofonDuzeniIc({
  seats,
  hostId,
  layoutCode,
  onSeatPress,
  onSeatLongPress,
}: Props) {
  const hamDuzen = OdaDuzeniniCoz(layoutCode);
  const seviye = yogunlukSeviyesi(seats.length);
  const yogun = seviye !== 'normal';
  const duzen = duzeniYogunlastir(hamDuzen, seviye);

  const seat0 = seats.find((s) => s.seat_index === 0) ?? null;
  const hostSeat =
    hostId != null ? seats.find((s) => s.user_id === hostId) ?? null : null;
  const taht = (seat0?.user_id ? seat0 : null) ?? hostSeat ?? seat0;

  const sirali = [...seats].sort((a, b) => a.seat_index - b.seat_index);
  const diger = sirali
    .filter((s) => s.seat_index !== 0 && s.id !== taht?.id)
    .sort((a, b) => a.seat_index - b.seat_index);

  // 12+ koltuk: Bigo/YoYo yoğun salon — host üstte, 4–5 kolon kompakt ızgara.
  // Arena / diamond / vip ray yüksekliği patlatır; zorla düz ızgaraya düş.
  if (yogun) {
    return (
      <View style={[styles.root, styles.yogunPad]}>
        {hamDuzen.varyant === 'equal_grid' ? (
          <IzgaraSatirlari
            seats={sirali}
            hostId={hostId}
            duzen={duzen}
            yogun
            onSeatPress={onSeatPress}
              onSeatLongPress={onSeatLongPress}
          />
        ) : (
          <>
            <TahtSatiri
              taht={taht}
              hostId={hostId}
              duzen={duzen}
              yogun
              onSeatPress={onSeatPress}
              onSeatLongPress={onSeatLongPress}
            />
            <IzgaraSatirlari
              seats={diger}
              hostId={hostId}
              duzen={duzen}
              yogun
              onSeatPress={onSeatPress}
              onSeatLongPress={onSeatLongPress}
            />
          </>
        )}
      </View>
    );
  }

  // Discord / varlık ızgarası — taht yok, herkes eşit karo
  if (duzen.varyant === 'equal_grid') {
    return (
      <View style={[styles.root, styles.equalPad]}>
        <IzgaraSatirlari
          seats={sirali}
          hostId={hostId}
          duzen={duzen}
          onSeatPress={onSeatPress}
              onSeatLongPress={onSeatLongPress}
        />
      </View>
    );
  }

  // Clubhouse — host üstte (yan yok), altta eşit konuşmacı ızgarası
  if (duzen.varyant === 'club_stage') {
    return (
      <View style={[styles.root, styles.stage, styles.clubPad]}>
        <TahtSatiri
          taht={taht}
          hostId={hostId}
          duzen={duzen}
          onSeatPress={onSeatPress}
              onSeatLongPress={onSeatLongPress}
        />
        <IzgaraSatirlari
          seats={diger}
          hostId={hostId}
          duzen={duzen}
          onSeatPress={onSeatPress}
              onSeatLongPress={onSeatLongPress}
        />
      </View>
    );
  }

  // Spaces / Greenroom — host + ilk 3 koltuk yatay şerit, kalan ızgara
  if (duzen.varyant === 'spaces_strip') {
    const serit = diger.slice(0, 3);
    const kalan = diger.slice(3);
    return (
      <View style={[styles.root, styles.stage]}>
        <TahtSatiri
          taht={taht}
          hostId={hostId}
          duzen={duzen}
          onSeatPress={onSeatPress}
              onSeatLongPress={onSeatLongPress}
        />
        {serit.length > 0 ? (
          <VipRay
            seats={serit}
            hostId={hostId}
            duzen={{ ...duzen, koltukOlcek: 'buyuk' }}
            onSeatPress={onSeatPress}
              onSeatLongPress={onSeatLongPress}
          />
        ) : null}
        <IzgaraSatirlari
          seats={kalan}
          hostId={hostId}
          duzen={duzen}
          onSeatPress={onSeatPress}
              onSeatLongPress={onSeatLongPress}
        />
      </View>
    );
  }

  // Parti dalgası — büyük host + kademeli 5 kolon
  if (duzen.varyant === 'party_wave') {
    return (
      <View style={[styles.root, styles.stage, styles.partyPad]}>
        <TahtSatiri
          taht={taht}
          hostId={hostId}
          duzen={duzen}
          onSeatPress={onSeatPress}
              onSeatLongPress={onSeatLongPress}
        />
        <IzgaraSatirlari
          seats={diger}
          hostId={hostId}
          duzen={duzen}
          onSeatPress={onSeatPress}
              onSeatLongPress={onSeatLongPress}
          offsetFn={(i) => cascadeOffset(i, 5)}
        />
      </View>
    );
  }

  if (duzen.varyant === 'arena') {
    return (
      <View style={[styles.root, styles.stage]}>
        <ArenaDuzen
          taht={taht}
          diger={diger}
          hostId={hostId}
          duzen={duzen}
          onSeatPress={onSeatPress}
              onSeatLongPress={onSeatLongPress}
        />
      </View>
    );
  }

  const yanlar =
    duzen.varyant === 'stage_spotlight' || duzen.varyant === 'theater'
      ? diger.slice(0, 2)
      : undefined;
  const kalan = yanlar ? diger.slice(yanlar.length) : diger;

  return (
    <View
      style={[
        styles.root,
        (duzen.sahneOdakli || duzen.varyant === 'stage_spotlight') &&
          styles.stage,
        duzen.varyant === 'lounge' && styles.loungePad,
      ]}
    >
      <TahtSatiri
        taht={taht}
        hostId={hostId}
        duzen={duzen}
        yanlar={yanlar}
        onSeatPress={onSeatPress}
              onSeatLongPress={onSeatLongPress}
      />

      {duzen.varyant === 'vip_rail' ? (
        <VipRay
          seats={kalan}
          hostId={hostId}
          duzen={duzen}
          onSeatPress={onSeatPress}
              onSeatLongPress={onSeatLongPress}
        />
      ) : duzen.varyant === 'diamond' ? (
        <DiamondIzgara
          seats={kalan}
          hostId={hostId}
          duzen={duzen}
          onSeatPress={onSeatPress}
              onSeatLongPress={onSeatLongPress}
        />
      ) : duzen.varyant === 'orbit' ? (
        <IzgaraSatirlari
          seats={kalan}
          hostId={hostId}
          duzen={duzen}
          onSeatPress={onSeatPress}
              onSeatLongPress={onSeatLongPress}
          offsetFn={(i) => orbitOffset(i, kalan.length)}
        />
      ) : duzen.varyant === 'cascade' ? (
        <IzgaraSatirlari
          seats={kalan}
          hostId={hostId}
          duzen={duzen}
          onSeatPress={onSeatPress}
              onSeatLongPress={onSeatLongPress}
          offsetFn={(i) => cascadeOffset(i, Math.min(Math.max(duzen.kolon, 2), 5))}
        />
      ) : (
        <IzgaraSatirlari
          seats={kalan}
          hostId={hostId}
          duzen={duzen}
          onSeatPress={onSeatPress}
              onSeatLongPress={onSeatLongPress}
        />
      )}
    </View>
  );
}

export const SesOdasiMikrofonDuzeni = memo(SesOdasiMikrofonDuzeniIc);

const styles = StyleSheet.create({
  root: {
    width: '100%',
    gap: 8,
    paddingBottom: 12,
  },
  stage: {
    paddingTop: 6,
    gap: 10,
  },
  loungePad: {
    paddingHorizontal: 6,
  },
  equalPad: {
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  clubPad: {
    paddingTop: 4,
    gap: 12,
  },
  partyPad: {
    paddingTop: 8,
    gap: 6,
  },
  yogunPad: {
    paddingTop: 2,
    paddingHorizontal: 2,
    gap: 4,
    paddingBottom: 4,
  },
  tahtBolum: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingTop: 2,
    paddingBottom: 6,
    gap: 8,
  },
  tahtBolumDev: {
    paddingBottom: 10,
  },
  tahtBolumOdak: {
    paddingTop: 8,
  },
  tahtBolumYogun: {
    paddingTop: 0,
    paddingBottom: 2,
    gap: 4,
  },
  tahtKartWrap: {
    position: 'relative',
    alignItems: 'center',
    minWidth: 120,
    overflow: 'visible',
  },
  tahtKartBuyuk: {
    minWidth: 132,
    transform: [{ scale: 1.04 }],
  },
  tahtKartDev: {
    minWidth: 148,
    transform: [{ scale: 1.1 }],
  },
  tahtKartYogun: {
    minWidth: 88,
    transform: [{ scale: 1 }],
  },
  tahtYan: {
    width: 86,
    alignItems: 'center',
    marginBottom: 8,
  },
  tahtYanYogun: {
    width: 64,
    marginBottom: 2,
  },
  tahtYanBos: {
    width: 72,
  },
  tahtBosPlaceholder: {
    height: 130,
    width: 110,
  },
  tahtBosDev: {
    height: 150,
    width: 128,
  },
  tahtBosYogun: {
    height: 72,
    width: 72,
  },
  gridKok: {
    width: '100%',
    paddingHorizontal: 4,
  },
  gridKokYogun: {
    paddingHorizontal: 2,
  },
  gridSatir: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
  },
  hucre: {
    alignItems: 'center',
    paddingVertical: 4,
    overflow: 'visible',
  },
  hucreYogun: {
    paddingVertical: 1,
  },
  diamondKok: {
    gap: 6,
    paddingHorizontal: 4,
  },
  diamondSatir: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  diamondHucre: {
    width: 84,
    alignItems: 'center',
  },
  arenaKok: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    gap: 4,
  },
  arenaKolon: {
    width: '26%',
    gap: 10,
    alignItems: 'center',
    paddingTop: 28,
  },
  arenaMerkez: {
    flex: 1,
    alignItems: 'center',
  },
  vipRay: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  vipHucre: {
    width: 88,
    alignItems: 'center',
  },
});
