import { Stack } from 'expo-router';

/** Web tanıtım sitesi. Dil, ülkeye göre kabukta seçilir. */
export default function TanitimYerlesim() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#080811' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="ozellikler" />
      <Stack.Screen name="coinler" />
      <Stack.Screen name="meyve" />
      <Stack.Screen name="hakkinda" />
      <Stack.Screen name="yatirim" />
      <Stack.Screen name="isbirligi" />
    </Stack>
  );
}
