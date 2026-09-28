import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Icon } from '../icon.tsx';
import { statusLabels, type EntityStatus } from '../status.ts';

export interface TileProps {
  label: string;
  /** SVG path, e.g. `mdiLightbulb`. */
  icon?: string;
  /** Second line. Replaced by the status label when the entity is not ready. */
  secondary?: ReactNode;
  status?: EntityStatus;
  active?: boolean;
  /** Highlights the tile as pending / done / failed after an action. */
  feedback?: 'pending' | 'done' | 'error' | undefined;
  onPress?: (() => void) | undefined;
  /** 0..1. Renders a fill bar; enables drag and arrow keys to change it. */
  fill?: number;
  /** Called once when a drag ends or an arrow key is pressed. */
  onFillChange?: (fill: number) => void;
  /** Controls shown on the right (steppers, icon buttons). */
  trailing?: ReactNode;
  title?: string;
}

const DRAG_THRESHOLD = 8;
const KEY_STEP = 0.05;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Base pill used by all entity tiles. */
export function Tile({
  label,
  icon,
  secondary,
  status = 'ready',
  active = false,
  feedback,
  onPress,
  fill,
  onFillChange,
  trailing,
  title,
}: TileProps) {
  const ready = status === 'ready';
  const adjustable = fill !== undefined && onFillChange !== undefined && ready;
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ x: number; dragging: boolean } | null>(null);
  const justDragged = useRef(false);

  const valueAt = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return rect.width > 0 ? clamp01((event.clientX - rect.left) / rect.width) : 0;
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!adjustable) return;
    start.current = { x: event.clientX, dragging: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    if (!s) return;
    if (!s.dragging && Math.abs(event.clientX - s.x) > DRAG_THRESHOLD) s.dragging = true;
    if (s.dragging) setDrag(valueAt(event));
  };
  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    start.current = null;
    if (!s?.dragging) return;
    justDragged.current = true;
    setDrag(null);
    onFillChange?.(valueAt(event));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!adjustable) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? KEY_STEP : -KEY_STEP;
      onFillChange?.(clamp01(Math.round(((drag ?? fill ?? 0) + delta) * 100) / 100));
    }
  };
  const onClick = () => {
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    onPress?.();
  };

  const shownFill = drag ?? fill;

  return (
    <div
      className="hash-tile"
      data-status={status}
      data-active={active && ready}
      data-fill={fill !== undefined}
      data-pending={feedback === 'pending'}
      data-feedback={feedback === 'pending' ? undefined : feedback}
    >
      <button
        type="button"
        className="hash-tile__main"
        disabled={!ready || (!onPress && !adjustable)}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          start.current = null;
          setDrag(null);
        }}
        onKeyDown={onKeyDown}
        title={title}
        aria-label={label}
      >
        {shownFill !== undefined && ready && active ? (
          <span className="hash-tile__fill" style={{ width: `${(shownFill ?? 0) * 100}%` }} />
        ) : null}
        {icon ? (
          <span className="hash-tile__icon">
            <Icon path={icon} />
          </span>
        ) : null}
        <span className="hash-tile__text">
          <span className="hash-tile__label">{label}</span>
          {!ready ? (
            <span className="hash-tile__secondary">{statusLabels[status]}</span>
          ) : secondary ? (
            <span className="hash-tile__secondary">{secondary}</span>
          ) : null}
        </span>
      </button>
      {trailing ? <div className="hash-tile__trailing">{trailing}</div> : null}
    </div>
  );
}

export function IconButton({
  path,
  label,
  onClick,
  disabled,
  active,
  primary,
}: {
  path: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className="hash-icon-button"
      aria-label={label}
      title={label}
      disabled={disabled}
      data-active={active}
      data-primary={primary}
      onClick={onClick}
    >
      <Icon path={path} />
    </button>
  );
}
