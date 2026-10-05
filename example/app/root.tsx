import { createLayout, HydrateFallback } from '@hash/runtime/app';
import { HashProvider, Page, type ThemeOverrides } from '@hash/ui';
import { Outlet } from 'react-router';

// App-wide look. `THEME` is `'light' | 'dark' | 'system'` (follows the OS and updates live);
// `FONT` is any Google Fonts family name (`'Inter'`, `'Roboto'`, `'Poppins'`, ...), loaded for you.
const THEME = 'system';
const FONT = 'Inter';

// Change any built-in token without touching `@hash/ui`; name only what differs. For example:
//   light: { palette: { accent: '#2d6cdf' } },       // colors, per theme
//   shared: { radius: { card: '16px' } },            // radii, typography, shadows, spacing
//   density: { comfortable: { space: 16 } },         // sizes that follow the display (spacing too)
const OVERRIDES: ThemeOverrides = {};

export const Layout = createLayout(THEME, FONT);
export { HydrateFallback };

// `Page` is what every dashboard renders into: padded, a column with gaps, viewport height, and
// scrolling inside itself. Swap it for your own wrapper if you want a different page.
export default function Root() {
  return (
    <HashProvider theme={THEME} font={FONT} overrides={OVERRIDES}>
      <Page>
        <Outlet />
      </Page>
    </HashProvider>
  );
}
