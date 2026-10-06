/** @jsxImportSource @emotion/react */
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

/** How much later each following item starts, in seconds, and how many are staggered at all. */
const STAGGER = 0.03;
const STAGGERED = 8;

/**
 * Fades its content in as it appears, rising a few pixels, a little later for each one after the
 * first (the first handful only, so a long list does not take long to arrive). It only moves what is
 * drawn inside it, never the room it takes, so nothing around it shifts. Where the person asks their
 * device for less motion it just appears.
 */
export function Reveal({ index = 0, children }: { index?: number; children: ReactNode }) {
  const still = useReducedMotion();
  if (still) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut', delay: Math.min(index, STAGGERED) * STAGGER }}
    >
      {children}
    </motion.div>
  );
}
