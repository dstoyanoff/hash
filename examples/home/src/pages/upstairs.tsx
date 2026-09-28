import {
  ActionButton,
  ClimateTile,
  LightTile,
  mdiBed,
  mdiDesk,
  mdiFlask,
  mdiShower,
  SceneButton,
  Section,
  SensorReadout,
} from '@hash/ui';

export default function Upstairs() {
  return (
    <>
      <Section
        title="master bedroom"
        icon={mdiBed}
        readouts={
          <>
            <SensorReadout entity="ha:sensor.master_bedroom_temperature" />
            <SensorReadout entity="ha:sensor.master_bedroom_humidity" />
          </>
        }
        columns={2}
      >
        <LightTile entity="ha:light.master_bedroom_lamp" name="night lamp" />
        <ClimateTile entity="ha:climate.master_bedroom" name="thermostat" />
      </Section>

      <Section
        title="bathroom"
        icon={mdiShower}
        readouts={
          <>
            <SensorReadout entity="ha:sensor.bathroom_temperature" />
            <SensorReadout entity="ha:sensor.bathroom_humidity" />
          </>
        }
        columns={3}
      >
        <LightTile entity="ha:light.bathroom_led" name="led" />
        <ActionButton
          label="shower"
          icon={mdiShower}
          action={{ domain: 'script', service: 'turn_on', entity: 'ha:script.shower' }}
        />
        <ActionButton
          label="septic additive"
          icon={mdiFlask}
          action={{ domain: 'script', service: 'turn_on', entity: 'ha:script.septic_additive' }}
        />
      </Section>

      <Section
        title="office"
        icon={mdiDesk}
        readouts={
          <>
            <SensorReadout entity="ha:sensor.office_temperature" />
            <SensorReadout entity="ha:sensor.office_humidity" />
          </>
        }
        columns={2}
      >
        <ClimateTile entity="ha:climate.office" name="thermostat" />
        <SceneButton entity="ha:scene.focus_mode" name="focus mode" />
      </Section>
    </>
  );
}
