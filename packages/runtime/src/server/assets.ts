import type { IncomingMessage, ServerResponse } from 'node:http';
import { ASSET_PATH, type Integration } from '@hashsome/core';

/** How long a browser may reuse a file; artwork URLs change when the picture does. */
const CACHE_CONTROL = 'private, max-age=3600';

/**
 * Serves `GET /_hashsome/asset/<integration>?path=<backend path>`: a file one of an integration's
 * entities points at (artwork, a person's picture), fetched by the server with the integration's
 * credentials so the browser never needs to reach, trust or log in to the backend. Only image
 * responses are passed on. Returns `false` for a request that is not an asset request, so the
 * caller can carry on.
 */
export async function serveAsset(
  integrations: Integration[],
  request: Pick<IncomingMessage, 'method' | 'url'>,
  response: ServerResponse,
): Promise<boolean> {
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (!url.pathname.startsWith(`${ASSET_PATH}/`)) {
    return false;
  }

  const fail = (status: number, message: string) => {
    response.statusCode = status;
    response.setHeader('content-type', 'text/plain');
    response.end(message);
    return true;
  };

  if (request.method !== 'GET') {
    return fail(405, 'Method not allowed');
  }

  const id = decodeURIComponent(url.pathname.slice(ASSET_PATH.length + 1));
  const path = url.searchParams.get('path');
  const integration = integrations.find((candidate) => candidate.id === id);
  if (!integration?.fetchAsset || !path) {
    return fail(404, 'No such asset');
  }

  try {
    const upstream = await integration.fetchAsset(path);
    const type = upstream.headers.get('content-type') ?? '';
    if (!upstream.ok || !type.startsWith('image/')) {
      return fail(upstream.ok ? 415 : 404, 'No such asset');
    }

    response.statusCode = 200;
    response.setHeader('content-type', type);
    response.setHeader('cache-control', CACHE_CONTROL);
    response.end(Buffer.from(await upstream.arrayBuffer()));
    return true;
  } catch {
    return fail(404, 'No such asset');
  }
}
