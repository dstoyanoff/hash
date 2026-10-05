import { HomeAssistantIntegration } from '@hashsome/integration.home-assistant';
import { createMock as createHomeAssistantMock } from '@hashsome/integration.home-assistant/mock';
import { MusicAssistantIntegration } from '@hashsome/integration.music-assistant';
import { createMock as createMusicAssistantMock } from '@hashsome/integration.music-assistant/mock';
import { defineConfig } from '@hashsome/runtime';
import { mockEntities } from './shared/mock-entities.ts';

// Dogfood instance: serves the dashboards in `dashboards/`. Set HA_URL/HA_TOKEN and/or
// MA_URL/MA_TOKEN to use a real Home Assistant and/or Music Assistant — they're independent,
// either/both/neither may be set; whichever is missing falls back to mock data. Neither
// integration package is special-cased by the runtime — this file is the only place that knows
// about either of them; a third integration would be wired up exactly the same way.
//
// Each integration package ships its own mock (`@hashsome/integration.*/mock`) with representative
// devices; the entities below are added on top of the Home Assistant one for these dashboards.
// The mock Home Assistant's devices are in `shared/mock-entities.ts`.
const { HA_URL, HA_TOKEN, MA_URL, MA_TOKEN } = process.env;

const ha =
  HA_URL && HA_TOKEN
    ? new HomeAssistantIntegration({ url: HA_URL, token: HA_TOKEN })
    : createHomeAssistantMock({
        entities: mockEntities,
      });

// Talked to directly, not through Home Assistant — see @hashsome/integration.music-assistant.
// Its mock has a few players (living_room, kitchen, office, an unavailable garage).
const ma =
  MA_URL && MA_TOKEN
    ? new MusicAssistantIntegration({ url: MA_URL, token: MA_TOKEN })
    : createMusicAssistantMock();

export default defineConfig({
  integrations: [ha, ma],
});
