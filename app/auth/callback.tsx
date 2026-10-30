import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { type Href, router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';

/**
 * muta://auth/callback — Google/Apple dönüşü.
 * Eşleşmeyen rota "sayfa yok" göstermesin; oturum zaten giriş akışında kurulur.
 */
export default function AuthCallbackSayfasi() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (session) {
      router.replace('/(tabs)' as Href);
      return;
    }
    const id = setTimeout(() => {
      router.replace('/(auth)/login' as Href);
    }, 700);
    return () => clearTimeout(id);
  }, [loading, session]);

  return (
    <View style={styles.root}>
      <ActivityIndicator color="#F4D47A" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B0614',
  },
});
