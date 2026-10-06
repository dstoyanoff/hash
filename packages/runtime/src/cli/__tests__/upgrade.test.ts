import { describe, expect, test } from 'vitest';
import {
  describeChanges,
  detectPackageManager,
  hashsomeDependencies,
  upgradeCommand,
} from '../upgrade.ts';

describe('hashsomeDependencies', () => {
  test('finds the @hashsome packages and leaves everything else', () => {
    expect(
      hashsomeDependencies({
        dependencies: { '@hashsome/ui': '0.1.0', react: '19.3.0', '@hashsome/runtime': '0.1.0' },
        devDependencies: { '@hashsome/core': '0.1.0', vite: '8.3.1' },
      }),
    ).toEqual({ upgrade: ['@hashsome/core', '@hashsome/runtime', '@hashsome/ui'], linked: [] });
  });

  test('a package linked from a local checkout is not upgraded', () => {
    expect(
      hashsomeDependencies({
        dependencies: {
          '@hashsome/ui': 'link:../hashsome/packages/ui',
          '@hashsome/core': 'workspace:*',
          '@hashsome/runtime': '0.1.0',
        },
      }),
    ).toEqual({
      upgrade: ['@hashsome/runtime'],
      linked: ['@hashsome/core', '@hashsome/ui'],
    });
  });

  test('a project without them has nothing', () => {
    expect(hashsomeDependencies({ dependencies: { react: '19.3.0' } })).toEqual({
      upgrade: [],
      linked: [],
    });
  });
});

describe('detectPackageManager', () => {
  const none = () => false;

  test('the one the project names wins', () => {
    expect(detectPackageManager({ packageManager: 'pnpm@12.6.0' }, none)).toBe('pnpm');
    expect(
      detectPackageManager({ packageManager: 'yarn@4.1.0' }, (f) => f === 'pnpm-lock.yaml'),
    ).toBe('yarn');
  });

  test('otherwise its lockfile says, and npm is the fallback', () => {
    expect(detectPackageManager({}, (f) => f === 'pnpm-lock.yaml')).toBe('pnpm');
    expect(detectPackageManager({}, (f) => f === 'yarn.lock')).toBe('yarn');
    expect(detectPackageManager({}, (f) => f === 'bun.lock')).toBe('bun');
    expect(detectPackageManager({}, none)).toBe('npm');
  });
});

describe('upgradeCommand', () => {
  const names = ['@hashsome/core', '@hashsome/ui'];

  test('is each manager’s own command to the latest release', () => {
    expect(upgradeCommand('pnpm', names)).toEqual(['pnpm', 'update', '--latest', ...names]);
    expect(upgradeCommand('npm', names)).toEqual([
      'npm',
      'install',
      '@hashsome/core@latest',
      '@hashsome/ui@latest',
    ]);

    expect(upgradeCommand('yarn', names)[1]).toBe('add');
    expect(upgradeCommand('bun', names)[0]).toBe('bun');
  });
});

describe('describeChanges', () => {
  test('lists the packages whose version moved', () => {
    expect(
      describeChanges(
        { dependencies: { '@hashsome/ui': '0.1.0', '@hashsome/core': '0.1.0' } },
        { dependencies: { '@hashsome/ui': '0.2.0', '@hashsome/core': '0.1.0' } },
      ),
    ).toEqual(['  @hashsome/ui  0.1.0 -> 0.2.0']);
  });

  test('nothing moved is nothing listed', () => {
    const same = { dependencies: { '@hashsome/ui': '0.1.0' } };
    expect(describeChanges(same, same)).toEqual([]);
  });
});
