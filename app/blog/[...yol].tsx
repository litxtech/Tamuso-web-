import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { BlogYol } from '../../src/moduller/blog/BlogPublic';
import { WebTanitimKabuk } from '../../src/moduller/web-tanitim/WebTanitimKabuk';

export default function BlogDiger() {
  const { yol } = useLocalSearchParams<{ yol?: string | string[] }>();
  const parca = Array.isArray(yol) ? yol : yol ? [yol] : [];
  return (
    <WebTanitimKabuk>
      <BlogYol parca={parca} />
    </WebTanitimKabuk>
  );
}
