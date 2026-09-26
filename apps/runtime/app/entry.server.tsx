import type { EntryContext, RouterContextProvider } from 'react-router';
import { ServerRouter } from 'react-router';
import { renderToReadableStream } from 'react-dom/server';

// Only renders the SPA shell (`ssr: false`), in dev and at build time. Adapted from React
// Router's default web entry without bot detection.
export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: RouterContextProvider,
) {
  if (request.method.toUpperCase() === 'HEAD') {
    return new Response(null, { status: responseStatusCode, headers: responseHeaders });
  }

  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      signal: AbortSignal.timeout(6000),
      onError(error: unknown) {
        responseStatusCode = 500;
        console.error(error);
      },
    },
  );
  await body.allReady;

  responseHeaders.set('Content-Type', 'text/html');
  return new Response(body, { headers: responseHeaders, status: responseStatusCode });
}
