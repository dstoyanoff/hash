import { defineDashboard } from '@hash/core';

export default defineDashboard({
  id: 'kitchen',
  title: 'Kitchen',
  // Assumption: no target device was specified, so this defaults to a tablet-landscape wall
  // mount (matching examples/home) — revisit if the real device is a small square panel or a
  // portrait mount instead.
  viewport: { width: 1024, height: 768 },
});
