/** Editör HTML'inden script ve olay özniteliklerini çıkarır. H1'i H2 yapar. */
export function blogHtmlTemizle(html: string): string {
  let out = String(html ?? '');
  out = out.replace(/<script[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<style[\s\S]*?<\/style>/gi, '');
  out = out.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '');
  out = out.replace(/javascript:/gi, '');
  out = out.replace(/<h1(\s[^>]*)?>/gi, '<h2>').replace(/<\/h1>/gi, '</h2>');
  out = out.replace(/<div\b[^>]*>/gi, '<p>').replace(/<\/div>/gi, '</p>');
  out = out.replace(/<iframe\b([^>]*)>(?:<\/iframe>)?/gi, (_tum, attrs: string) => {
    const src = /src\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1] ?? '';
    if (/^https:\/\/(www\.youtube\.com|www\.youtube-nocookie\.com|player\.vimeo\.com)\//.test(src)) {
      return `<iframe src="${src}" title="Video" loading="lazy" allowfullscreen></iframe>`;
    }
    return '';
  });
  return out.trim();
}

export function blogDuzMetin(html: string): string {
  return String(html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function altsizGorselVar(html: string): boolean {
  return /<img\b(?![^>]*\balt="[^"]+")[^>]*>/i.test(html);
}
