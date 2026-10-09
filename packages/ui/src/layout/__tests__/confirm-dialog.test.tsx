import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { renderWithMock } from '../../test-utils.tsx';
import { ConfirmDialog } from '../confirm-dialog.tsx';

afterEach(cleanup);

const show = (props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) => {
  const onConfirm = vi.fn<() => void>();
  const onCancel = vi.fn<() => void>();
  renderWithMock(
    <ConfirmDialog
      open
      title="Mark it as done?"
      description="Last done 1 Oct."
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    >
      <input aria-label="Extra" />
    </ConfirmDialog>,
    {},
  );

  return { onConfirm, onCancel };
};

test('nothing is on the page while it is closed', () => {
  show({ open: false });
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('it is a labelled modal dialog, drawn over the page, with its question and its extra content', () => {
  show();
  const dialog = screen.getByRole('dialog', { name: 'Mark it as done?' });
  expect(dialog.getAttribute('aria-modal')).toBe('true');
  expect(dialog.textContent).toContain('Last done 1 Oct.');
  expect(screen.getByLabelText('Extra')).toBeTruthy();
  // On the document, not inside whatever opened it.
  expect(dialog.closest('body')).toBe(document.body);
});

test('only the confirm button goes ahead: cancel, a tap outside and Escape all back out', () => {
  const { onConfirm, onCancel } = show();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onCancel).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(onCancel).toHaveBeenCalledTimes(2);
  // The scrim is the dialog's parent; a tap inside the card does not reach it.
  fireEvent.click(screen.getByRole('dialog'));
  expect(onCancel).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('dialog').parentElement!);
  expect(onCancel).toHaveBeenCalledTimes(3);

  expect(onConfirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

test('the buttons take their own labels, and wait while busy', () => {
  show({ confirmLabel: 'Mark as done', cancelLabel: 'Not yet', busy: true });
  expect((screen.getByRole('button', { name: 'Mark as done' }) as HTMLButtonElement).disabled).toBe(
    true,
  );

  expect((screen.getByRole('button', { name: 'Not yet' }) as HTMLButtonElement).disabled).toBe(
    true,
  );
});

test('focus moves into the dialog and Tab stays inside it', () => {
  show();
  const dialog = screen.getByRole('dialog');
  expect(document.activeElement).toBe(dialog);
  const confirm = screen.getByRole('button', { name: 'Confirm' });
  confirm.focus();
  fireEvent.keyDown(confirm, { key: 'Tab' });
  expect(document.activeElement).toBe(screen.getByLabelText('Extra'));
});
