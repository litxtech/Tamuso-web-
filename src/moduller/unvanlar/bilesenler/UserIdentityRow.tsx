import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { BoslukTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { DogrulanmisTik } from '../../kullanici-profili/bilesenler/DogrulanmisTik';
import { OzellikBayragiAktifMi } from '../../ozellik-bayraklari/OzellikBayragiAktifMi';
import { useCeviri } from '../../../i18n/useCeviri';
import { UnvanSunumunuCoz } from '../okuma/UnvanSunumunuCoz';
import type { TitlePresentationModel, UnvanSize } from '../tipler';
import { UserTitleBadge } from './UserTitleBadge';

type Props = {
  displayName: string;
  verified?: boolean | null;
  titleId?: string | null;
  title?: TitlePresentationModel | null;
  size?: UnvanSize;
  onPress?: () => void;
  nameStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  numberOfLines?: number;
};

/**
 * displayName (flexShrink) + doğrulanmış tik + ünvan rozeti.
 */
export function UserIdentityRow({
  displayName,
  verified,
  titleId,
  title,
  size = 'NORMAL',
  onPress,
  nameStyle,
  style,
  numberOfLines = 1,
}: Props) {
  const { dil } = useCeviri();
  const titlesOn = OzellikBayragiAktifMi('user_titles_enabled');

  const presentation = useMemo(() => {
    if (!titlesOn) return null;
    if (title) return title;
    if (titleId) return UnvanSunumunuCoz(titleId, dil);
    return null;
  }, [titlesOn, title, titleId, dil]);

  const tikSize = size === 'PROMINENT' ? 18 : size === 'COMPACT' ? 13 : 15;
  const nameSize =
    size === 'PROMINENT'
      ? TipografiTokenlari.body.fontSize
      : size === 'COMPACT'
        ? TipografiTokenlari.caption.fontSize
        : TipografiTokenlari.body.fontSize;

  const row = (
    <View style={[styles.row, style]}>
      <Text
        numberOfLines={numberOfLines}
        ellipsizeMode="tail"
        style={[
          styles.name,
          {
            color: RenkTokenlari.text,
            fontSize: nameSize,
            fontWeight: TipografiTokenlari.body.fontWeight,
          },
          nameStyle,
        ]}
      >
        {displayName?.trim() || '—'}
      </Text>
      <DogrulanmisTik dogrulandi={verified} size={tikSize} />
      {presentation ? (
        <UserTitleBadge presentation={presentation} size={size} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" hitSlop={6}>
        {row}
      </Pressable>
    );
  }
  return row;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.xs,
    minWidth: 0,
  },
  name: {
    flexShrink: 1,
    minWidth: 0,
  },
});
