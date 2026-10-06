import React from 'react';
import { LaunchAppsList } from '../../../src/moduller/admin/app-launch/bilesenler/LaunchAppsList';

export default function AdminAppLaunchScheduled() {
  return (
    <LaunchAppsList
      filter="scheduled"
      title="Scheduled"
      subtitle="Zamanlanmış yayınlar"
    />
  );
}
