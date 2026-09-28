import { HomeAssistantIntegration, MusicAssistantIntegration } from '@hash/core';
import { expect, test } from 'vitest';
import { integrationsFromEnv } from './config.ts';

test('no env vars set yields no integrations', () => {
  expect(integrationsFromEnv({})).toEqual([]);
});

test('HA_URL/HA_TOKEN alone yields only Home Assistant', () => {
  const integrations = integrationsFromEnv({ HA_URL: 'http://ha', HA_TOKEN: 'x' });
  expect(integrations).toHaveLength(1);
  expect(integrations[0]).toBeInstanceOf(HomeAssistantIntegration);
});

test('MA_URL/MA_TOKEN alone yields only Music Assistant', () => {
  const integrations = integrationsFromEnv({ MA_URL: 'http://mass', MA_TOKEN: 'x' });
  expect(integrations).toHaveLength(1);
  expect(integrations[0]).toBeInstanceOf(MusicAssistantIntegration);
});

test('both sets of env vars yield both integrations, independently', () => {
  const integrations = integrationsFromEnv({
    HA_URL: 'http://ha',
    HA_TOKEN: 'x',
    MA_URL: 'http://mass',
    MA_TOKEN: 'y',
  });
  expect(integrations).toHaveLength(2);
  expect(integrations[0]).toBeInstanceOf(HomeAssistantIntegration);
  expect(integrations[1]).toBeInstanceOf(MusicAssistantIntegration);
});

test('a URL without its token is ignored, for either integration', () => {
  expect(integrationsFromEnv({ HA_URL: 'http://ha' })).toEqual([]);
  expect(integrationsFromEnv({ MA_URL: 'http://mass' })).toEqual([]);
});
