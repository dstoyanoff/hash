export interface IconProps {
  /** SVG path, e.g. `mdiLightbulb`. */
  path: string;
  className?: string;
}

export function Icon({ path, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ? `hash-icon ${className}` : 'hash-icon'}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}
