import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import { HashProvider } from '@hash/ui';

const kioskCss = `
  html, body { margin: 0; height: 100%; background: #101114; color: #e6e6e6; }
  body { overscroll-behavior: none; -webkit-tap-highlight-color: transparent; user-select: none; }
  #root, body > div { min-height: 100%; }
`;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="color-scheme" content="dark" />
        <style dangerouslySetInnerHTML={{ __html: kioskCss }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  return null;
}

export default function Root() {
  return (
    <HashProvider>
      <Outlet />
    </HashProvider>
  );
}
