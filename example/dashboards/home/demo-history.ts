// Demo sensor history for this example — no integration provides readings over time yet, so a
// small deterministic wave stands in (35 days at 30-minute spacing: a daily cycle plus a slower
// drift). Swap for a real history source once one exists.
export function demoHistory(base: number, daily: number, drift: number) {
  const step = 30 * 60_000;
  const count = 35 * 48;
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const t = now - (count - 1 - i) * step;
    const hours = (t / 3_600_000) % 24;
    const days = t / 86_400_000;
    const value =
      base +
      daily * Math.sin((hours / 24) * 2 * Math.PI) +
      drift * Math.sin(days / 2.3) +
      Math.sin(i * 1.7) * 0.4;

    return { timestamp: new Date(t).toISOString(), value: Math.round(value * 10) / 10 };
  });
}
