import {
  ActionButton,
  ClimateTile,
  Grid,
  LightTile,
  MediaPlayerBar,
  mdiHomeOutline,
  mdiLock,
  mdiRobotVacuum,
  mdiSilverwareForkKnife,
  mdiSofa,
  SceneButton,
  Section,
  SensorReadout,
} from '@hash/ui';

export default function Downstairs() {
  return (
    <>
      {/* Talked to directly via Music Assistant, not through Home Assistant — same component,
          same hooks, no special-casing needed; see @hash/core's MusicAssistantIntegration. */}
      <Section title="media" columns={0}>
        <MediaPlayerBar entity="ma:living_room" />
      </Section>

      <Section
        title="living room"
        icon={mdiSofa}
        readouts={
          <>
            <SensorReadout entity="ha:sensor.living_room_temperature" />
            <SensorReadout entity="ha:sensor.living_room_humidity" />
          </>
        }
        columns={0}
      >
        <Grid columns={3}>
          <LightTile entity="ha:light.living_room_lamp" name="lamp" />
          <LightTile entity="ha:light.living_room_wall" name="wall lights" />
          <LightTile entity="ha:light.living_room_accent" name="accent" />
        </Grid>
        <ClimateTile entity="ha:climate.living_room" name="heater" />
        <Grid columns={2}>
          <SceneButton entity="ha:scene.movie_night" name="movie night" />
          <ActionButton
            label="vacuum"
            icon={mdiRobotVacuum}
            action={{ domain: 'vacuum', service: 'start', entity: 'ha:vacuum.robot' }}
          />
        </Grid>
      </Section>

      <Section
        title="kitchen"
        icon={mdiSilverwareForkKnife}
        readouts={<SensorReadout entity="ha:sensor.kitchen_temperature" />}
        columns={3}
      >
        <LightTile entity="ha:light.kitchen_ceiling" name="ceiling" />
        <LightTile entity="ha:light.kitchen_led" name="led strip" />
        <SceneButton entity="ha:scene.cooking_time" name="cooking time" />
      </Section>

      <Section
        title="porch"
        icon={mdiHomeOutline}
        readouts={
          <>
            <SensorReadout entity="ha:sensor.porch_temperature" />
            <SensorReadout entity="ha:sensor.porch_humidity" />
          </>
        }
        columns={3}
      >
        <LightTile entity="ha:light.porch_lamp" name="porch lamp" />
        <LightTile entity="ha:light.porch_ambient" name="ambient" />
        <ActionButton
          label="front door"
          icon={mdiLock}
          action={{ domain: 'lock', service: 'lock', entity: 'ha:lock.front_door' }}
        />
      </Section>
    </>
  );
}
