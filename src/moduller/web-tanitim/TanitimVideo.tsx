import { Image, StyleSheet, View } from 'react-native';

/** Native yedek: tanıtım sayfası webde açılır. */
export function TanitimVideo({ poster }: { kaynak: string; poster: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} />
    </View>
  );
}
