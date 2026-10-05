/** @jsxImportSource @emotion/react */
import { Box } from 'e-prim';
import { motion } from 'motion/react';
import { HOLD_MS } from './use-hold.ts';

/** The thin line along a card's top edge that fills while a press is being timed as a hold. */
export function HoldProgress() {
  return (
    <Box
      as={motion.span}
      position="absolute"
      height={2}
      background="textMuted"
      initial={{ width: '0%' }}
      animate={{ width: '100%' }}
      transition={{ duration: HOLD_MS / 1000, ease: 'linear' }}
      css={{ top: 0, left: 0, opacity: 0.5, pointerEvents: 'none' }}
    />
  );
}
