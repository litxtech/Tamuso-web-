import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { yaziBelgesi } from '../scripts/blog-motor.mjs';

const html = yaziBelgesi({
  title: 'التعرف على أشخاص جدد في طرابزون',
  slug: 'ornek-arapca',
  language_code: 'ar',
  excerpt: 'معاينة محلية لاتجاه الصفحة. هذا النص غير منشور.',
  content_html: '<p>هذا مثال محلي للتحقق من اتجاه الكتابة من اليمين إلى اليسار. لم يُنشر على الموقع.</p><h2>الساحل</h2><p>النص يبقى في اللغة نفسها ولا يُفهرس من هذه المعاينة.</p>',
  status: 'yayinda',
  robots_index: false,
  author_name: 'فريق تحرير تاموسو',
}, []);
const onizleme = path.resolve('.cache/ar-onizleme.html');
fs.writeFileSync(onizleme, html);

const root = path.resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.xml': 'application/xml' };
const server = http.createServer((req, res) => {
  const yol = decodeURIComponent((req.url || '/').split('?')[0]);
  if (yol === '/rtl') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' });
    res.end(html);
    return;
  }
  let hedef = path.normalize(path.join(root, yol));
  if (!hedef.startsWith(root)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (fs.existsSync(hedef) && fs.statSync(hedef).isDirectory()) hedef = path.join(hedef, 'index.html');
  if (!fs.existsSync(hedef) || !fs.statSync(hedef).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' });
    res.end('404');
    return;
  }
  const ext = path.extname(hedef);
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  res.end(fs.readFileSync(hedef));
});
server.listen(4174, '127.0.0.1', () => console.log('4174'));
