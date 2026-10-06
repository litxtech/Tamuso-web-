import React from 'react';
import { LaunchAppsList } from '../../../src/moduller/admin/app-launch/bilesenler/LaunchAppsList';

export default function AdminAppLaunchIndex() {
  return (
    <LaunchAppsList
      filter="all"
      title="App Launch Center"
      subtitle="Tüm uygulamalar · showcase · mağaza linkleri"
    />
  );
}
