import { Redirect } from 'expo-router';

/** iOS'ta harici ödeme dönüş ekranı yoktur. */
export default function OdemeBasariliIos() {
  return <Redirect href="/(tabs)/wallet" />;
}
