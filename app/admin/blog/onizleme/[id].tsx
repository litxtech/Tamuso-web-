import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { BlogOnizlemeEkrani } from '../../../../src/moduller/blog/BlogPublic';

export default function AdminBlogOnizleme() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BlogOnizlemeEkrani id={String(id || '')} />;
}
