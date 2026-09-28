/**
 * Connects to a real Home Assistant and prints entity states.
 *
 *   HA_URL=http://homeassistant.local:8123 HA_TOKEN=... pnpm --filter @hash/integration.home-assistant states
 *   ... pnpm --filter @hash/integration.home-assistant states --types   # emit entities.d.ts instead
 */
import { generateEntityTypes } from '@hash/core';
import { HomeAssistantIntegration } from '../src/index.ts';

const url = process.env.HA_URL;
const token = process.env.HA_TOKEN;
if (!url || !token) {
  console.error('Set HA_URL and HA_TOKEN');
  process.exit(1);
}

const ha = new HomeAssistantIntegration({ url, token });
await ha.connect();
// Entities arrive asynchronously after subscribing.
await new Promise((resolve) => setTimeout(resolve, 1500));

const states = ha.getAllStates().sort((a, b) => a.ref.localeCompare(b.ref));
if (process.argv.includes('--types')) {
  console.log(generateEntityTypes(states.map((s) => s.ref)));
} else {
  for (const s of states) console.log(`${s.ref}\t${s.state}`);
  console.error(`${states.length} entities`);
}
ha.disconnect();
