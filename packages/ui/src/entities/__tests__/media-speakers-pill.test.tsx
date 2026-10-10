import { mockMediaPlayer } from '@hashsome/core';
import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { renderWithMock } from '../../test-utils.tsx';
import { SpeakersPill, summaryLabel } from '../media-speakers-pill.tsx';
import { useEntityHandle } from '../../hooks.ts';

function Pill({ speakers }: { speakers?: `${string}:${string}`[] }) {
  const handle = useEntityHandle('mediaPlayer', 'ha:porch');
  return <SpeakersPill player={handle.entity} speakers={speakers} onClick={() => {}} />;
}

const room = (name: string, extra: Record<string, unknown> = {}) =>
  mockMediaPlayer({ name, capabilities: { group: true }, ...extra });

test('alone, with nothing playing elsewhere, the pill just says Speakers', async () => {
  renderWithMock(<Pill />, {
    porch: room('Porch', { groupable: ['ha:kitchen'] }),
    kitchen: room('Kitchen'),
  });

  expect(await screen.findByRole('button', { name: 'Speakers: Speakers' })).toBeTruthy();
});

test('in a group, it counts the speakers that play together', async () => {
  renderWithMock(<Pill />, {
    porch: room('Porch', {
      groupable: ['ha:kitchen', 'ha:patio'],
      group: { leader: 'ha:porch', members: ['ha:kitchen', 'ha:patio'] },
    }),
    kitchen: room('Kitchen'),
    patio: room('Patio'),
  });

  expect(await screen.findByRole('button', { name: 'Speakers: 3 speakers' })).toBeTruthy();
});

test('a stream playing in another room is named, and counted when there are several', async () => {
  const one = renderWithMock(<Pill />, {
    porch: room('Porch', { groupable: ['ha:kitchen', 'ha:patio'] }),
    kitchen: room('Kitchen', { playback: 'playing', media: { title: 'Dreams' } }),
    patio: room('Patio'),
  });

  expect(await screen.findByRole('button', { name: 'Speakers: Kitchen playing' })).toBeTruthy();
  one.unmount();

  renderWithMock(<Pill />, {
    porch: room('Porch', { groupable: ['ha:kitchen', 'ha:patio'] }),
    kitchen: room('Kitchen', { playback: 'playing', media: { title: 'Dreams' } }),
    patio: room('Patio', { playback: 'playing', media: { title: 'Blue Monday' } }),
  });

  expect(await screen.findByRole('button', { name: 'Speakers: 2 streams playing' })).toBeTruthy();
});

test('only the speakers an allowlist lets through are counted', async () => {
  renderWithMock(<Pill speakers={['ha:patio']} />, {
    porch: room('Porch', { groupable: ['ha:kitchen', 'ha:patio'] }),
    kitchen: room('Kitchen', { playback: 'playing', media: { title: 'Dreams' } }),
    patio: room('Patio'),
  });

  expect(await screen.findByRole('button', { name: 'Speakers: Speakers' })).toBeTruthy();
});

test('the words for a summary', () => {
  expect(summaryLabel({ together: 0, elsewhere: [] })).toBe('Speakers');
  expect(summaryLabel({ together: 2, elsewhere: [] })).toBe('2 speakers');
  expect(summaryLabel({ together: 0, elsewhere: ['Patio'] })).toBe('Patio playing');
  expect(summaryLabel({ together: 0, elsewhere: ['A', 'B'] })).toBe('2 streams playing');
});
