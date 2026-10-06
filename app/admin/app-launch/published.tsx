import React from 'react';
import { LaunchAppsList } from '../../../src/moduller/admin/app-launch/bilesenler/LaunchAppsList';

export default function AdminAppLaunchPublished() {
  return (
    <LaunchAppsList
      filter="published"
      title="Published"
      subtitle="Canlı showcase sayfaları"
    />
  );
}
