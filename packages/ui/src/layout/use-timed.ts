import { useEffect, useRef, useState } from 'react';

/** Whether something that plays for a fixed time is playing. `start` begins it, and it is over `ms`
 * later whatever else happens; starting it while it plays does nothing, so a press cannot be repeated until
 * the animation it set off is over. */
export function useTimed(ms: number) {
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Cleared with the component: a timer left running would set state on what is gone.
  useEffect(() => () => clearTimeout(timer.current), []);

  const start = (): boolean => {
    if (timer.current !== undefined) {
      return false;
    }

    setActive(true);
    timer.current = setTimeout(() => {
      timer.current = undefined;
      setActive(false);
    }, ms);

    return true;
  };

  return { active, start };
}
