import { useMemo, type ReactNode } from 'react';
import { ActionButton } from '../entities/ActionButton.tsx';
import { ClimateTile } from '../entities/ClimateTile.tsx';
import { LightTile } from '../entities/LightTile.tsx';
import { MediaPlayerBar } from '../entities/MediaPlayerBar.tsx';
import { NavTabs } from '../entities/NavTabs.tsx';
import { SceneButton } from '../entities/SceneButton.tsx';
import { SensorReadout } from '../entities/SensorReadout.tsx';
import { mdiBed, mdiShower, mdiSofa } from '../icons.ts';
import { Dashboard } from '../layout/Dashboard.tsx';
import { Grid } from '../layout/Grid.tsx';
import { Screen } from '../layout/Screen.tsx';
import { Section } from '../layout/Section.tsx';
import { HashProvider } from '../provider.tsx';
import { createGalleryClient } from './fixtures.ts';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Section title={title} columns={0}>
      {children}
    </Section>
  );
}

/**
 * Every component in every state, backed by an in-browser mock. Served at `/gallery` by
 * `hash-dash dev`; the visual reference for building dashboards. Must be rendered inside a router
 * (the tab bar uses router links).
 */
export function Gallery({ density = 'comfortable' }: { density?: 'comfortable' | 'compact' }) {
  const client = useMemo(() => createGalleryClient(), []);
  return (
    <HashProvider client={client}>
      <Dashboard density={density}>
        <Screen scroll>
          <NavTabs
            items={[
              { to: '/gallery', label: 'Living room', icon: mdiSofa },
              { to: '/gallery/bedroom', label: 'Bedroom', icon: mdiBed },
              { to: '/gallery/bathroom', label: 'Bathroom', icon: mdiShower },
            ]}
          />

          <Section
            title="living room"
            icon={mdiSofa}
            readouts={
              <>
                <SensorReadout entity="ha:sensor.temperature" />
                <SensorReadout entity="ha:sensor.humidity" />
              </>
            }
          >
            <LightTile entity="ha:light.plain_on" />
            <LightTile entity="ha:light.plain_off" />
          </Section>

          <Block title="lights">
            <Grid>
              <LightTile entity="ha:light.dimmable" />
              <LightTile entity="ha:light.colour" />
              <LightTile entity="ha:light.unavailable" />
              <LightTile entity="ha:light.missing" />
            </Grid>
          </Block>

          <Block title="climate">
            <Grid columns={1}>
              <ClimateTile entity="ha:climate.heater" />
              <ClimateTile entity="ha:climate.off" />
              <ClimateTile entity="ha:climate.unavailable" />
            </Grid>
          </Block>

          <Block title="sensor readouts">
            <Grid columns={4}>
              <SensorReadout entity="ha:sensor.temperature" />
              <SensorReadout entity="ha:sensor.humidity" />
              <SensorReadout entity="ha:sensor.unavailable" />
              <SensorReadout entity="ha:sensor.unknown" />
            </Grid>
          </Block>

          <Block title="scenes and actions">
            <Grid columns={3}>
              <SceneButton entity="ha:scene.tv_time" />
              <ActionButton
                label="shower"
                icon={mdiShower}
                action={{ domain: 'script', service: 'turn_on', entity: 'ha:script.shower' }}
              />
              <ActionButton
                label="always fails"
                action={{ domain: 'x', service: 'y', integration: 'nope' }}
              />
            </Grid>
          </Block>

          <Block title="media">
            <MediaPlayerBar entity="ha:media_player.living_room" />
            <MediaPlayerBar entity="ha:media_player.off" />
          </Block>
        </Screen>
      </Dashboard>
    </HashProvider>
  );
}
