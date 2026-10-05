import { describe, expect, it } from 'vitest';
import { bump, levelFor, notes, parse, prependChangelog } from './release-lib.ts';

const c = (subject: string, body = '') => parse({ hash: 'abcdef1234567', subject, body })!;

describe('parse', () => {
  it('reads type, scope and description', () => {
    expect(c('feat(ui): add a thing')).toMatchObject({
      type: 'feat',
      scope: 'ui',
      description: 'add a thing',
      breaking: false,
    });
  });

  it('sees a breaking change in the subject or the footer', () => {
    expect(c('feat!: drop it').breaking).toBe(true);
    expect(c('fix: x', 'details\n\nBREAKING CHANGE: gone').breaking).toBe(true);
  });

  it('ignores commits that are not conventional', () => {
    expect(parse({ hash: 'a', subject: 'Update stuff', body: '' })).toBeUndefined();
  });
});

describe('levelFor', () => {
  it('feat is a minor and fix a patch', () => {
    expect(levelFor([c('feat: a'), c('fix: b')], '0.1.0')).toBe('minor');
    expect(levelFor([c('fix: b'), c('docs: c')], '0.1.0')).toBe('patch');
  });

  it('a breaking change is a minor below 1.0 and a major after', () => {
    expect(levelFor([c('feat!: a')], '0.4.2')).toBe('minor');
    expect(levelFor([c('fix!: a')], '1.2.0')).toBe('major');
  });

  it('nothing user-facing is no release', () => {
    expect(levelFor([c('docs: a'), c('chore: b'), c('ci: c')], '0.1.0')).toBeUndefined();
  });
});

describe('bump', () => {
  it('bumps each level and resets what is below it', () => {
    expect(bump('0.54.1', 'minor')).toBe('0.55.0');
    expect(bump('0.54.1', 'patch')).toBe('0.54.2');
    expect(bump('0.54.1', 'major')).toBe('1.0.0');
  });
});

describe('notes and changelog', () => {
  it('lists user-facing commits by section and leaves out the rest', () => {
    const text = notes([c('feat(ui): a'), c('fix: b'), c('chore: c')], 'https://x');
    expect(text).toContain('### Features');
    expect(text).toContain('**ui:** a ([abcdef1](https://x/commit/abcdef1234567))');
    expect(text).toContain('### Fixes');
    expect(text).not.toContain('chore');
  });

  it('puts the newest release first, under the title', () => {
    const first = prependChangelog('', '0.2.0', '2026-10-06', '- one');
    const second = prependChangelog(first, '0.3.0', '2026-10-07', '- two');
    expect(second.indexOf('## 0.3.0')).toBeLessThan(second.indexOf('## 0.2.0'));
    expect(second.startsWith('# Changelog')).toBe(true);
  });
});
