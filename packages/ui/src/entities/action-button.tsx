import { parseEntityRef, type EntityRef } from '@hash/core';
import { useEffect, useRef, useState } from 'react';
import { useCallService } from '../hooks.ts';
import { Tile } from '../layout/tile.tsx';

export interface ActionButtonProps {
  label: string;
  /** SVG path. */
  icon?: string;
  secondary?: string;
  /** Service to call, e.g. `{ domain: 'script', service: 'turn_on', entity: 'ha:script.shower' }`. */
  action: {
    domain: string;
    service: string;
    /** Target entity; its prefix picks the integration. */
    entity?: EntityRef;
    /** Integration when there is no `entity`. Default `ha`. */
    integration?: string;
    data?: Record<string, unknown>;
  };
}

/** Any one-shot service call (script, button, automation, ...) with pending / done / error feedback. */
export function ActionButton({ label, icon, secondary, action }: ActionButtonProps) {
  const callService = useCallService();
  const [feedback, setFeedback] = useState<'pending' | 'done' | 'error' | undefined>();
  const [error, setError] = useState<string>();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const press = () => {
    const target = action.entity ? parseEntityRef(action.entity) : undefined;
    setFeedback('pending');
    setError(undefined);
    callService(target?.integration ?? action.integration ?? 'ha', {
      domain: action.domain,
      service: action.service,
      ...(target ? { entityIds: [target.id] } : {}),
      ...(action.data ? { data: action.data } : {}),
    })
      .then(
        () => setFeedback('done'),
        (err: unknown) => {
          setFeedback('error');
          setError(err instanceof Error ? err.message : String(err));
        },
      )
      .finally(() => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setFeedback(undefined), 1200);
      });
  };

  return (
    <Tile
      label={label}
      {...(icon ? { icon } : {})}
      {...(secondary ? { secondary } : {})}
      feedback={feedback}
      onPress={feedback === 'pending' ? undefined : press}
      {...(error ? { title: error } : {})}
    />
  );
}
