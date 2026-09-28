import { fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, test } from 'vitest';
import { renderWithMock } from '../test-utils.tsx';
import { ActionButton } from './action-button.tsx';
import { SceneButton } from './scene-button.tsx';

test('scene button activates the scene', () => {
  const { ha } = renderWithMock(<SceneButton entity="ha:scene.tv" />, {
    'scene.tv': { state: 'scening', attributes: { friendly_name: 'tv time' } },
  });
  fireEvent.click(screen.getByRole('button', { name: 'tv time' }));
  expect(ha.calls).toEqual([{ domain: 'scene', service: 'turn_on', entityIds: ['scene.tv'] }]);
});

test('action button calls the service with data and shows feedback', async () => {
  const { ha, container } = renderWithMock(
    <ActionButton
      label="shower"
      action={{ domain: 'script', service: 'turn_on', entity: 'ha:script.shower', data: { a: 1 } }}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'shower' }));
  expect(ha.calls[0]).toEqual({
    domain: 'script',
    service: 'turn_on',
    entityIds: ['script.shower'],
    data: { a: 1 },
  });
  await waitFor(() => expect(container.querySelector('[data-feedback="done"]')).not.toBeNull());
});

test('failed actions are flagged with the error', async () => {
  const { container } = renderWithMock(
    <ActionButton label="x" action={{ domain: 'a', service: 'b', integration: 'nope' }} />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'x' }));
  await waitFor(() => expect(container.querySelector('[data-feedback="error"]')).not.toBeNull());
  expect(screen.getByRole('button', { name: 'x' }).title).toMatch(/Unknown integration/);
});
