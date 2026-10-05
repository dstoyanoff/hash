/** @jsxImportSource @emotion/react */
import { LocalClient } from '@hashsome/core';
import { createMock as createHomeAssistantMock } from '@hashsome/integration.home-assistant/mock';
import { createMock as createMusicAssistantMock } from '@hashsome/integration.music-assistant/mock';
import { createLayout, HydrateFallback } from '@hashsome/runtime/app';
import { HashsomeProvider, Page } from '@hashsome/ui';
import { Box } from 'e-prim';
import { Outlet } from 'react-router';
import { mockEntities } from '../../example/shared/mock-entities.ts';

const THEME = 'system';
const FONT = 'Inter';

export const Layout = createLayout(THEME, FONT);
export { HydrateFallback };

// The example's devices, kept in the browser instead of behind the Hashsome server: this page is
// static, so nothing is reachable and nothing you press leaves it. A fresh load starts over.
const client = new LocalClient([
  createHomeAssistantMock({ entities: mockEntities }),
  createMusicAssistantMock(),
]);

export default function Root() {
  return (
    <HashsomeProvider theme={THEME} font={FONT} client={client}>
      <Page>
        <Outlet />
      </Page>
      <Box
        as="a"
        href="https://github.com/dstoyanoff/hashsome"
        target="_blank"
        rel="noreferrer"
        position="fixed"
        background="surfaceRaised"
        color="textMuted"
        radius="full"
        typography="secondary"
        px={3}
        py={1.5}
        zIndex="popover"
        css={{ right: 16, bottom: 16, textDecoration: 'none' }}
      >
        Live demo on mock data · Hashsome on GitHub ↗
      </Box>
    </HashsomeProvider>
  );
}
