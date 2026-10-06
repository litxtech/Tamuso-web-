import React from 'react';
import { LaunchAppsList } from '../../../src/moduller/admin/app-launch/bilesenler/LaunchAppsList';

export default function AdminAppLaunchArchived() {
  return (
    <LaunchAppsList
      filter="archived"
      title="Archived"
      subtitle="Arşivlenmiş uygulamalar"
    />
  );
}
