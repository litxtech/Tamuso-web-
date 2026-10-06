import Head from 'expo-router/head';
import sayfalar from './seoSayfalari.json';

const KAYIT = new Map(sayfalar.map((s) => [s.yol, s]));

export function TanitimSeo({ yol }: { yol: string }) {
  const sayfa = KAYIT.get(yol) ?? KAYIT.get('/tanitim');
  if (!sayfa) return null;
  const url = `https://www.tamuso.com${sayfa.yol === '/' ? '/' : sayfa.yol}`;
  return (
    <Head>
      <title>{sayfa.title}</title>
      <meta name="description" content={sayfa.description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={sayfa.title} />
      <meta property="og:description" content={sayfa.description} />
      <meta property="og:url" content={url} />
    </Head>
  );
}
