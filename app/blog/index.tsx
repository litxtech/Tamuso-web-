import React from 'react';
import { BlogListeGorunum } from '../../src/moduller/blog/BlogPublic';
import { WebTanitimKabuk } from '../../src/moduller/web-tanitim/WebTanitimKabuk';

export default function BlogSayfasi() {
  return (
    <WebTanitimKabuk>
      <BlogListeGorunum />
    </WebTanitimKabuk>
  );
}
