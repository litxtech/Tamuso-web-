import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { OdaDuzenTanim } from '../duzen/OdaDuzeniniCoz';

type Props = {
  duzen: Pick<OdaDuzenTanim, 'varyant' | 'kolon' | 'vurgu' | 'tahtOlcek'>;
};

function Nokta({
  boy,
  renk,
  style,
}: {
  boy: number;
  renk: string;
  style?: object;
}) {
  return (
    <View
      style={[
        {
          width: boy,
          height: boy,
          borderRadius: boy / 2,
          backgroundColor: renk,
        },
        style,
      ]}
    />
  );
}

function Satir({
  adet,
  boy,
  renk,
  gap = 3,
  offsetY = 0,
}: {
  adet: number;
  boy: number;
  renk: string;
  gap?: number;
  offsetY?: number;
}) {
  return (
    <View style={[styles.satir, { gap, marginTop: offsetY }]}>
      {Array.from({ length: adet }, (_, i) => (
        <Nokta key={i} boy={boy} renk={renk} />
      ))}
    </View>
  );
}

/**
 * Düzen seçim kartı — koltukların nasıl dizileceğini gösteren minyatür sahne.
 */
function OdaDuzenOnizlemeMiniIc({ duzen }: Props) {
  const v = duzen.varyant;
  const vurgu = duzen.vurgu;
  const soft = `${vurgu}99`;
  const dim = `${vurgu}66`;
  const kolon = Math.min(Math.max(duzen.kolon, 2), 5);
  const tahtBoy =
    duzen.tahtOlcek === 'dev' ? 14 : duzen.tahtOlcek === 'buyuk' ? 12 : 10;

  if (v === 'equal_grid') {
    return (
      <View style={styles.kok}>
        <Satir adet={kolon} boy={7} renk={soft} />
        <Satir adet={kolon} boy={7} renk={dim} />
        <Satir adet={Math.max(2, kolon - 1)} boy={7} renk={dim} />
      </View>
    );
  }

  if (v === 'arena') {
    return (
      <View style={styles.arena}>
        <View style={styles.arenaKolon}>
          <Nokta boy={6} renk={dim} />
          <Nokta boy={6} renk={soft} />
          <Nokta boy={6} renk={dim} />
        </View>
        <Nokta boy={tahtBoy + 2} renk={vurgu} />
        <View style={styles.arenaKolon}>
          <Nokta boy={6} renk={dim} />
          <Nokta boy={6} renk={soft} />
          <Nokta boy={6} renk={dim} />
        </View>
      </View>
    );
  }

  if (v === 'diamond') {
    return (
      <View style={styles.kok}>
        <Nokta boy={tahtBoy} renk={vurgu} />
        <Satir adet={2} boy={6} renk={soft} gap={10} />
        <Satir adet={3} boy={6} renk={dim} gap={5} />
        <Satir adet={2} boy={6} renk={dim} gap={10} />
      </View>
    );
  }

  if (v === 'vip_rail') {
    return (
      <View style={styles.kok}>
        <Nokta boy={tahtBoy} renk={vurgu} />
        <View style={[styles.satir, { gap: 4, marginTop: 6 }]}>
          {[0, 1, 2, 3].map((i) => (
            <Nokta key={i} boy={7} renk={i === 0 ? soft : dim} />
          ))}
        </View>
      </View>
    );
  }

  if (v === 'spaces_strip') {
    return (
      <View style={styles.kok}>
        <Nokta boy={tahtBoy} renk={vurgu} />
        <Satir adet={3} boy={8} renk={soft} gap={5} />
        <Satir adet={4} boy={6} renk={dim} gap={3} />
      </View>
    );
  }

  if (v === 'stage_spotlight' || v === 'theater' || v === 'duo_focus') {
    return (
      <View style={styles.kok}>
        <View style={[styles.satir, { gap: 6, alignItems: 'flex-end' }]}>
          <Nokta boy={7} renk={soft} style={{ marginBottom: 2 }} />
          <Nokta boy={tahtBoy + 2} renk={vurgu} />
          <Nokta boy={7} renk={soft} style={{ marginBottom: 2 }} />
        </View>
        <Satir adet={kolon} boy={6} renk={dim} />
        {v !== 'duo_focus' ? <Satir adet={kolon} boy={6} renk={dim} /> : null}
      </View>
    );
  }

  if (v === 'orbit') {
    return (
      <View style={styles.kok}>
        <Nokta boy={tahtBoy} renk={vurgu} />
        <View style={[styles.satir, { gap: 3, marginTop: 2 }]}>
          {[0, 1, 2, 3].map((i) => (
            <Nokta
              key={i}
              boy={6}
              renk={i === 1 || i === 2 ? soft : dim}
              style={{ marginTop: i === 1 || i === 2 ? 0 : 5 }}
            />
          ))}
        </View>
        <Satir adet={3} boy={6} renk={dim} gap={4} offsetY={2} />
      </View>
    );
  }

  if (v === 'cascade' || v === 'party_wave') {
    return (
      <View style={styles.kok}>
        <Nokta boy={tahtBoy + (v === 'party_wave' ? 2 : 0)} renk={vurgu} />
        <View style={[styles.satir, { gap: 3, marginTop: 4 }]}>
          {Array.from({ length: Math.min(5, kolon + 1) }, (_, i) => (
            <Nokta
              key={i}
              boy={6}
              renk={i % 2 === 0 ? soft : dim}
              style={{ marginTop: i % 2 === 1 ? 5 : 0 }}
            />
          ))}
        </View>
        <View style={[styles.satir, { gap: 3, marginTop: 2 }]}>
          {Array.from({ length: Math.min(5, kolon + 1) }, (_, i) => (
            <Nokta
              key={i}
              boy={6}
              renk={dim}
              style={{ marginTop: i % 2 === 0 ? 5 : 0 }}
            />
          ))}
        </View>
      </View>
    );
  }

  if (v === 'lounge' || v === 'hex') {
    return (
      <View style={styles.kok}>
        <Nokta boy={tahtBoy} renk={vurgu} />
        <Satir adet={3} boy={7} renk={soft} gap={5} />
        <Satir adet={4} boy={6} renk={dim} gap={3} />
      </View>
    );
  }

  if (v === 'club_stage') {
    return (
      <View style={styles.kok}>
        <Nokta boy={tahtBoy + 1} renk={vurgu} />
        <Satir adet={3} boy={7} renk={soft} gap={4} />
        <Satir adet={3} boy={7} renk={dim} gap={4} />
      </View>
    );
  }

  // grid (varsayılan) + bilinmeyen
  return (
    <View style={styles.kok}>
      <Nokta boy={tahtBoy} renk={vurgu} />
      <Satir adet={kolon} boy={6} renk={soft} gap={3} />
      <Satir adet={kolon} boy={6} renk={dim} gap={3} />
    </View>
  );
}

export const OdaDuzenOnizlemeMini = memo(OdaDuzenOnizlemeMiniIc);

const styles = StyleSheet.create({
  kok: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arena: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  arenaKolon: {
    gap: 4,
    alignItems: 'center',
  },
});
