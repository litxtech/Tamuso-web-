import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { BlogEditorEkrani } from '../../../src/moduller/blog/BlogEditorEkrani';

export default function AdminBlogDuzenle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id || id === 'yeni') return <BlogEditorEkrani />;
  return <BlogEditorEkrani id={id} />;
}
