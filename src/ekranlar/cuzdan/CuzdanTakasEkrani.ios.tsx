import { Redirect } from 'expo-router';

/** Coin takası kapalı; iOS paketinde ekran bulunmaz. */
export default function TakasIos() {
  return <Redirect href="/(tabs)/wallet" />;
}
