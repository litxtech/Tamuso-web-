import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Safari ve Chrome: uygulama yüksekliği adres çubuğunun altında kalsın,
 * yatay taşma sayfayı kaydırmasın, input odaklanınca sayfa yakınlaşmasın.
 */
const WEB_KABUK = `
html, body, #root {
  width: 100%;
  max-width: 100%;
  margin: 0;
  background: #07060d;
}
html, body, #root {
  height: 100%;
  height: 100svh;
}
body {
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
#root {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  position: relative;
  overflow: hidden;
}
@media (pointer: coarse) {
  input, textarea, select {
    font-size: 16px !important;
  }
}
`;

export default function Root({ children }: PropsWithChildren) {
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } =
    useServerDocumentContext();

  return (
    <html lang="tr" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: WEB_KABUK }} />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var p=location.pathname;if(p.length>1&&p.endsWith('/')){p=p.replace(/\\/+$/,'');history.replaceState(null,'',p+location.search+location.hash);}var site=p==='/'||p.indexOf('/tanitim')===0;var kisa=window.screen?Math.min(screen.width,screen.height):window.innerWidth;var dar=kisa<760;if(site&&dar){var m=document.querySelector('meta[name=viewport]');if(m)m.setAttribute('content','width=device-width, initial-scale=0.75, minimum-scale=0.5, viewport-fit=cover, interactive-widget=resizes-content');}})();",
          }}
        />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
