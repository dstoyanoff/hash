import type { EntityRef } from '@hashsome/core';
import { useEntityLogbook } from '../use-entity-logbook.ts';
import { HistorySection } from './history-section.tsx';

/** A drawer's History section filled from the backend: it asks for the entity's recent activity when
 * it is drawn (so only when the drawer opens), and shows nothing until there is some. */
export function LogbookHistory({ entity }: { entity: EntityRef }) {
  const { entries } = useEntityLogbook(entity);
  return entries ? <HistorySection entries={entries} /> : null;
}
