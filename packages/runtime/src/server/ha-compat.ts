import { randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** The Home Assistant version this claims to be: a recent one, so a client with a minimum accepts it. */
export const HA_COMPAT_VERSION = '2026.9.0';

type Next = (error?: unknown) => void;

const send = (res: ServerResponse, body: unknown, type = 'application/json') => {
  const text = JSON.stringify(body);
  res.statusCode = 200;
  res.setHeader('Content-Type', type);
  res.setHeader('Content-Length', Buffer.byteLength(text));
  res.end(text);
};

/** A request's body, JSON or a form (the token request is a form). Never throws. */
async function bodyOf(req: IncomingMessage): Promise<Record<string, string>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }

  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(text) as Record<string, string>;
  } catch {
    return Object.fromEntries(new URLSearchParams(text));
  }
}

/**
 * Answers the requests a device makes to check that an address is a Home Assistant, as Home
 * Assistant's own documented authentication and API do (https://developers.home-assistant.io/docs/auth_api/):
 * the login flow, a token, `/api/`, `/api/config`, `/api/discovery_info` and `/manifest.json`. Any login
 * is accepted, because there is nothing behind it: Hashsome has no login of its own. Everything else
 * goes on to the app. For a wall display that only opens a Home Assistant (the Shelly Wall Display).
 */
export function homeAssistantCompat() {
  return async (req: IncomingMessage, res: ServerResponse, next: Next): Promise<void> => {
    try {
      const { pathname } = new URL(req.url ?? '/', 'http://localhost');
      const method = req.method ?? 'GET';
      const base = `http://${req.headers.host ?? 'localhost'}`;
      const handler = ['homeassistant', null];

      if (method === 'GET' && pathname === '/auth/providers') {
        return send(res, {
          providers: [{ name: 'Home Assistant Local', id: null, type: 'homeassistant' }],
          preselect_remember_me: true,
        });
      }

      if (method === 'POST' && pathname === '/auth/login_flow') {
        await bodyOf(req);
        return send(res, {
          type: 'form',
          flow_id: randomBytes(16).toString('hex'),
          handler,
          step_id: 'init',
          data_schema: [
            { type: 'string', name: 'username', required: true },
            { type: 'string', name: 'password', required: true },
          ],
          errors: {},
          description_placeholders: null,
          last_step: null,
          preview: null,
        });
      }

      const step = /^\/auth\/login_flow\/([^/]+)$/.exec(pathname);
      if (method === 'POST' && step) {
        await bodyOf(req);
        return send(res, {
          version: 1,
          type: 'create_entry',
          flow_id: step[1],
          handler,
          title: 'Home',
          result: randomBytes(16).toString('hex'),
          description: null,
          description_placeholders: null,
        });
      }

      if (method === 'POST' && pathname === '/auth/token') {
        await bodyOf(req);
        return send(res, {
          access_token: randomBytes(24).toString('hex'),
          expires_in: 1800,
          refresh_token: randomBytes(24).toString('hex'),
          token_type: 'Bearer',
        });
      }

      if (pathname === '/api' || pathname === '/api/') {
        return send(res, { message: 'API running.' });
      }

      if (pathname === '/api/config') {
        return send(res, {
          components: ['api', 'auth', 'config', 'frontend', 'http', 'lovelace', 'websocket_api'],
          config_dir: '/config',
          location_name: 'Home',
          time_zone: 'UTC',
          unit_system: { length: 'km', mass: 'g', temperature: '°C', volume: 'L' },
          state: 'RUNNING',
          internal_url: base,
          external_url: null,
          version: HA_COMPAT_VERSION,
        });
      }

      if (pathname === '/api/discovery_info') {
        return send(res, {
          base_url: base,
          location_name: 'Home',
          requires_api_password: false,
          uuid: 'hashsome',
          version: HA_COMPAT_VERSION,
        });
      }

      if (pathname === '/manifest.json') {
        return send(
          res,
          {
            name: 'Home Assistant',
            short_name: 'Home Assistant',
            description: 'Home automation platform that puts local control and privacy first.',
            id: '/?homescreen=1',
            start_url: '/?homescreen=1',
            display: 'standalone',
            dir: 'ltr',
            lang: 'en-US',
            background_color: '#FFFFFF',
            theme_color: '#2980b9',
            prefer_related_applications: true,
            related_applications: [{ platform: 'play', id: 'io.homeassistant.companion.android' }],
          },
          'application/manifest+json',
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
