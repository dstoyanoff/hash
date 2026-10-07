import { expect, test } from 'vitest';
import { isDarkAt, minutesOf, msUntilSwitch, sunIsDown } from '../schedule.ts';

const at = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(2026, 9, 6, hours, minutes, 0, 0);
};

const night = { from: '19:00', to: '07:00' };
const day = { from: '09:00', to: '17:00' };

test('dark hours that run past midnight', () => {
  expect(isDarkAt(night, at('18:59'))).toBe(false);
  expect(isDarkAt(night, at('19:00'))).toBe(true);
  expect(isDarkAt(night, at('00:00'))).toBe(true);
  expect(isDarkAt(night, at('06:59'))).toBe(true);
  expect(isDarkAt(night, at('07:00'))).toBe(false);
  expect(isDarkAt(night, at('12:00'))).toBe(false);
});

test('dark hours within one day', () => {
  expect(isDarkAt(day, at('08:59'))).toBe(false);
  expect(isDarkAt(day, at('09:00'))).toBe(true);
  expect(isDarkAt(day, at('16:59'))).toBe(true);
  expect(isDarkAt(day, at('17:00'))).toBe(false);
});

test('the same time twice is never dark, and never switches', () => {
  const none = { from: '08:00', to: '08:00' };
  expect(isDarkAt(none, at('08:00'))).toBe(false);
  expect(isDarkAt(none, at('20:00'))).toBe(false);
  expect(msUntilSwitch(none, at('12:00'))).toBe(Infinity);
});

test('how long until the next change, whichever boundary is first, rolling over midnight', () => {
  const minute = 60_000;
  const hour = 60 * minute;
  expect(msUntilSwitch(night, at('12:00'))).toBe(7 * hour); // to 19:00
  expect(msUntilSwitch(night, at('20:00'))).toBe(11 * hour); // to 07:00 tomorrow
  expect(msUntilSwitch(night, at('06:30'))).toBe(30 * minute);
  expect(msUntilSwitch(night, at('19:00'))).toBe(12 * hour); // just switched: the next is 07:00
});

test('a time that is not HH:MM is refused, naming which one', () => {
  expect(() => minutesOf('7pm', 'from')).toThrow(
    'theme.dark.from must be a time like "19:00", not "7pm"',
  );

  expect(() => minutesOf('24:00', 'to')).toThrow('theme.dark.to must be a time like');
  expect(() => isDarkAt({ from: '19:00', to: '7:00' }, at('12:00'))).toThrow('theme.dark.to');
});

test('a sun entity is down when it is below the horizon, and unknown when it says nothing useful', () => {
  expect(sunIsDown({ kind: 'generic', value: 'below_horizon' })).toBe(true);
  expect(sunIsDown({ kind: 'generic', value: 'above_horizon' })).toBe(false);
  expect(sunIsDown({ kind: 'generic', value: 'unavailable' })).toBeUndefined();
  expect(sunIsDown({ kind: 'sensor', value: 'below_horizon' })).toBeUndefined();
  expect(sunIsDown(undefined)).toBeUndefined();
  expect(sunIsDown(null)).toBeUndefined();
});
