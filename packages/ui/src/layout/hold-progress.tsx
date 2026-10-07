/** @jsxImportSource @emotion/react */
import { keyframes } from '@emotion/react';
import { Box } from 'e-prim';
import { HOLD_MS } from './use-hold.ts';

/** Grows the line from its left end by scaling it, which the browser animates on its own, without
 * the page's JavaScript or a layout for each frame: on a slow display, animating the width is what
 * made the hold look stuck. */
const fill = keyframes({
  from: { transform: 'scaleX(0)' },
  to: { transform: 'scaleX(1)' },
});

/** The thin line along a card's top edge that fills while a press is being timed as a hold. */
export function HoldProgress() {
  return (
    <Box
      as="span"
      position="absolute"
      width="100%"
      height={2}
      background="textMuted"
      css={{
        top: 0,
        left: 0,
        opacity: 0.5,
        pointerEvents: 'none',
        transformOrigin: 'left center',
        willChange: 'transform',
        animation: `${fill} ${HOLD_MS}ms linear forwards`,
      }}
    />
  );
}
