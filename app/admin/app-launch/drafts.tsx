import React from 'react';
import { LaunchAppsList } from '../../../src/moduller/admin/app-launch/bilesenler/LaunchAppsList';

export default function AdminAppLaunchDrafts() {
  return (
    <LaunchAppsList
      filter="draft"
      title="Drafts"
      subtitle="Taslak uygulamalar"
    />
  );
}
