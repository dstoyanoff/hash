/**
 * Connects to a real Music Assistant server and prints its players (talked to directly, not via
 * Home Assistant).
 *
 *   MA_URL=http://mass.local:8095 MA_TOKEN=... pnpm --filter @hashsome/integration.music-assistant players
 */
import { MusicAssistantIntegration } from '../src/index.ts';

const url = process.env.MA_URL;
const token = process.env.MA_TOKEN;
if (!url || !token) {
  console.error('Set MA_URL and MA_TOKEN (Music Assistant → Settings → Profile)');
  process.exit(1);
}

const ma = new MusicAssistantIntegration({ url, token });
await ma.connect();

const players = ma.listEntities().toSorted((a, b) => a.ref.localeCompare(b.ref));
if (players.length === 0) {
  console.error('Connected, but no players were returned.');
} else {
  for (const p of players) {
    if (p.kind !== 'mediaPlayer') {
      continue;
    }

    const title = p.media?.title;
    console.log(`${p.ref}\t${p.name}\t${p.playback}${title ? `\t${title}` : ''}`);
  }

  console.error(`${players.length} player(s)`);
}

ma.disconnect();
