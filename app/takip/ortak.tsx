import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { OrtakTakipcilerEkrani } from '../../src/moduller/takip/ekranlar/OrtakTakipcilerEkrani';

export default function OrtakTakipcilerRoute() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  return <OrtakTakipcilerEkrani userId={String(userId ?? '')} />;
}
