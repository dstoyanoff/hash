import type { ServerResponse } from 'node:http';
import type { Integration } from '@hashsome/core';
import { expect, test, vi } from 'vitest';
import { serveAsset } from '../assets.ts';

function fakeResponse() {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 0,
    setHeader: (name: string, value: string) => void (headers[name] = value),
    end: vi.fn<(body?: unknown) => void>(),
  };

  return { res, headers, asResponse: res as unknown as ServerResponse };
}

const integration = (fetchAsset?: (path: string) => Promise<Response>) =>
  ({ id: 'ha', ...(fetchAsset ? { fetchAsset } : {}) }) as unknown as Integration;

const image = () =>
  new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } });

test('passes through a request that is not an asset request', async () => {
  const { asResponse } = fakeResponse();
  expect(await serveAsset([], { method: 'GET', url: '/ws' }, asResponse)).toBe(false);
});

test("serves an integration's image with a cache header", async () => {
  const fetchAsset = vi.fn<(path: string) => Promise<Response>>(async () => image());
  const { res, headers, asResponse } = fakeResponse();
  const served = await serveAsset(
    [integration(fetchAsset)],
    { method: 'GET', url: `/_hashsome/asset/ha?path=${encodeURIComponent('/api/x?token=1')}` },
    asResponse,
  );

  expect(served).toBe(true);
  expect(fetchAsset).toHaveBeenCalledWith('/api/x?token=1');
  expect(res.statusCode).toBe(200);
  expect(headers['content-type']).toBe('image/jpeg');
  expect(headers['cache-control']).toContain('max-age');
});

test('refuses anything that is not an image, a failed fetch, an unknown integration or a POST', async () => {
  const cases: [Integration[], string, string][] = [
    [
      [
        integration(
          async () => new Response('{}', { headers: { 'content-type': 'application/json' } }),
        ),
      ],
      'GET',
      '/_hashsome/asset/ha?path=%2Fa',
    ],
    [
      [
        integration(
          async () => new Response('x', { status: 404, headers: { 'content-type': 'image/png' } }),
        ),
      ],
      'GET',
      '/_hashsome/asset/ha?path=%2Fa',
    ],
    [
      [
        integration(async () => {
          throw new Error('refused');
        }),
      ],
      'GET',
      '/_hashsome/asset/ha?path=%2Fa',
    ],
    [[integration(async () => image())], 'GET', '/_hashsome/asset/other?path=%2Fa'],
    [[integration()], 'GET', '/_hashsome/asset/ha?path=%2Fa'],
    [[integration(async () => image())], 'GET', '/_hashsome/asset/ha'],
    [[integration(async () => image())], 'POST', '/_hashsome/asset/ha?path=%2Fa'],
  ];

  for (const [integrations, method, url] of cases) {
    const { res, asResponse } = fakeResponse();
    expect(await serveAsset(integrations, { method, url }, asResponse)).toBe(true);
    expect(res.statusCode).toBeGreaterThanOrEqual(404);
  }
});
