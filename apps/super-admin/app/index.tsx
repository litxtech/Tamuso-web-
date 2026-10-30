import React from 'react';
import { Redirect } from 'expo-router';

/** Panelin kökü doğrudan kontrol merkezine gider. */
export default function AdminKok() {
  return <Redirect href="/admin" />;
}
