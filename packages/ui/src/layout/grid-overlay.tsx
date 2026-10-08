/** @jsxImportSource @emotion/react */
import { useTheme } from '@emotion/react';
import { Box } from 'e-prim';
import { useLayoutEffect, useRef, useState } from 'react';
import { gridMetrics, offGrid } from '../theme/grid.ts';

interface Measured {
  left: number;
  top: number;
  width: number;
  height: number;
  cards: { x: number; y: number; width: number; height: number; off: boolean }[];
}

const SAME = (a: Measured | null, b: Measured) =>
  a !== null && JSON.stringify(a) === JSON.stringify(b);

/** Draws the grid over the page it sits in (the `Page`, when `?grid` is on the address): a faint
 * line at every module, a stronger one at every tile pitch, and a box round every card (anything
 * marked `data-grid-card`) with its height in modules, green when its top and height are on the grid
 * and red when they are not. For laying out a dashboard for one device: see where things fall, and
 * what to change. Never takes a touch. */
export function GridOverlay() {
  const theme = useTheme();
  const metrics = gridMetrics(theme.density.space);
  const { module, tilePitch } = metrics;
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<Measured | null>(null);

  useLayoutEffect(() => {
    const host = ref.current?.parentElement;
    if (!host) {
      return;
    }

    let frame = 0;
    const measure = () => {
      const style = getComputedStyle(host);
      const left = parseFloat(style.paddingLeft);
      const top = parseFloat(style.paddingTop);
      const box = host.getBoundingClientRect();
      const next: Measured = {
        left,
        top,
        width: host.scrollWidth - left - parseFloat(style.paddingRight),
        height: host.scrollHeight - top - parseFloat(style.paddingBottom),
        cards: [...host.querySelectorAll('[data-grid-card]')].map((card) => {
          const rect = card.getBoundingClientRect();
          const x = rect.left - box.left + host.scrollLeft - left;
          const y = rect.top - box.top + host.scrollTop - top;

          return {
            x: Math.round(x * 10) / 10,
            y: Math.round(y * 10) / 10,
            width: Math.round(rect.width * 10) / 10,
            height: Math.round(rect.height * 10) / 10,
            off: offGrid(y, rect.height, module),
          };
        }),
      };

      setView((current) => (SAME(current, next) ? current : next));
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    schedule();
    window.addEventListener('resize', schedule);
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
    resize?.observe(host);
    // What the page is made of changing (a card appearing, a size changing): not this overlay's own.
    const mutations = new MutationObserver((records) => {
      if (records.some((record) => !ref.current?.contains(record.target))) {
        schedule();
      }
    });

    mutations.observe(host, { subtree: true, childList: true, attributes: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      resize?.disconnect();
      mutations.disconnect();
    };
  }, [module]);

  // A line every module, unless that is too fine to read, then every gap (3 modules).
  const minor = module >= 3.5 ? module : module * 3;
  const off = view?.cards.filter((card) => card.off).length ?? 0;

  return (
    <div ref={ref} data-grid-overlay aria-hidden="true">
      {view ? (
        <>
          <Box
            position="absolute"
            css={{
              left: view.left,
              top: view.top,
              width: view.width,
              height: view.height,
              pointerEvents: 'none',
              zIndex: 4,
              backgroundImage: [
                `linear-gradient(to bottom, rgba(0, 150, 255, 0.5) 1px, transparent 1px)`,
                `linear-gradient(to right, rgba(0, 150, 255, 0.5) 1px, transparent 1px)`,
                `linear-gradient(to bottom, rgba(0, 150, 255, 0.12) 1px, transparent 1px)`,
                `linear-gradient(to right, rgba(0, 150, 255, 0.12) 1px, transparent 1px)`,
              ].join(', '),
              backgroundSize: [
                `100% ${tilePitch}px`,
                `${tilePitch}px 100%`,
                `100% ${minor}px`,
                `${minor}px 100%`,
              ].join(', '),
            }}
          >
            {view.cards.map((card) => (
              <Box
                key={`${card.x}:${card.y}:${card.width}:${card.height}`}
                position="absolute"
                css={{
                  left: card.x,
                  top: card.y,
                  width: card.width,
                  height: card.height,
                  boxSizing: 'border-box',
                  outline: `1px solid ${card.off ? '#ef4444' : '#22c55e'}`,
                  outlineOffset: -1,
                  color: card.off ? '#ef4444' : '#22c55e',
                  font: '600 9px/1 system-ui, sans-serif',
                  padding: 2,
                  overflow: 'hidden',
                }}
              >
                {card.height >= 14 ? `${Math.round((card.height / module) * 10) / 10}u` : null}
              </Box>
            ))}
          </Box>
          <Box
            position="fixed"
            css={{
              left: 8,
              bottom: 8,
              zIndex: 100,
              pointerEvents: 'none',
              background: 'rgba(0, 0, 0, 0.78)',
              color: '#fff',
              font: '600 11px/1.3 system-ui, sans-serif',
              padding: '4px 8px',
              borderRadius: 6,
            }}
          >
            {`grid · 1u = ${Math.round(module * 100) / 100}px · gap 3u · tile ${Math.round(metrics.tile / module)}u · ${off === 0 ? 'all on grid' : `${off} off grid`}`}
          </Box>
        </>
      ) : null}
    </div>
  );
}
