import type { IconName } from '@hash/ui';
import { Grid, RoomHeader } from '@hash/ui';

/** Placeholder for a nav item that's routed but not built yet — keeps the link from 404ing while
 * the real page is deferred. Replace with the real page content when it's ready. */
export function ComingSoon({ title, icon }: { title: string; icon: IconName }) {
  return (
    <>
      <RoomHeader title={title} icon={icon} />
      <Grid columns={2}>
        <p>This page isn’t built yet.</p>
      </Grid>
    </>
  );
}
