import {
  ClimateTile,
  Dashboard,
  LightTile,
  mdiSofa,
  Screen,
  Section,
  SensorReadout,
} from '@hash/ui';

export default function Home() {
  return (
    <Dashboard>
      <Screen scroll>
        <Section
          title="living room"
          icon={mdiSofa}
          readouts={<SensorReadout entity="ha:sensor.temperature" />}
        >
          <LightTile entity="ha:light.lamp" name="lamp" />
          <ClimateTile entity="ha:climate.heater" name="heater" />
        </Section>
      </Screen>
    </Dashboard>
  );
}
