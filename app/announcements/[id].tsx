import { Redirect, useLocalSearchParams } from 'expo-router';

/** Push sözleşmesi /announcements/{id}. Uygulama rotası /duyuru/{id}. */
export default function DuyuruPushAlias() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const hedef = typeof id === 'string' && id ? `/duyuru/${id}` : '/duyuru';
  return <Redirect href={hedef as never} />;
}
