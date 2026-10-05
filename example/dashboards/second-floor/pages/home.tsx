import {
  ActionButton,
  ClimateTile,
  Grid,
  LightTile,
  RoomHeader,
  SceneButton,
  SensorReadout,
} from '@hashsome/ui';
import { HomeTopBar } from '../../../shared/top-bar.tsx';

export const meta = () => [{ title: '2nd Floor' }];

export default function Home() {
  return (
    <>
      <HomeTopBar title="2nd Floor" scenes={['ha:scene.focus_mode']} />
      <RoomHeader
        title="Master Bedroom"
        icon="lu:bed"
        readouts={
          <>
            <SensorReadout entity="ha:sensor.master_bedroom_temperature" />
            <SensorReadout entity="ha:sensor.master_bedroom_humidity" />
          </>
        }
      />
      <Grid columns={2}>
        <LightTile
          entity="ha:light.master_bedroom_lamp"
          name="Night Lamp"
          energy={{
            power: 'ha:sensor.master_bedroom_lamp_power',
            energy: 'ha:sensor.master_bedroom_lamp_energy',
          }}
        />
        <ClimateTile
          entity="ha:climate.master_bedroom"
          name="Thermostat"
          energy={{
            power: 'ha:sensor.master_bedroom_heater_power',
            energy: 'ha:sensor.master_bedroom_heater_energy',
          }}
        />
      </Grid>

      <RoomHeader
        title="Bathroom"
        icon="tb:bath"
        readouts={
          <>
            <SensorReadout entity="ha:sensor.bathroom_temperature" />
            <SensorReadout entity="ha:sensor.bathroom_humidity" />
          </>
        }
      />
      <Grid columns={3}>
        <LightTile
          entity="ha:light.bathroom_led"
          name="LED"
          icon="lu:sparkles"
          energy={{
            power: 'ha:sensor.bathroom_led_power',
            energy: 'ha:sensor.bathroom_led_energy',
          }}
        />
        <ActionButton label="Shower" icon="tb:bath" entity="ha:script.shower" />
        <ActionButton
          label="Septic Additive"
          icon="lu:flask-conical"
          entity="ha:script.septic_additive"
        />
      </Grid>

      <RoomHeader
        title="Office"
        icon="tb:desk"
        readouts={
          <>
            <SensorReadout entity="ha:sensor.office_temperature" />
            <SensorReadout entity="ha:sensor.office_humidity" />
          </>
        }
      />
      <Grid columns={2}>
        <ClimateTile
          entity="ha:climate.office"
          name="Thermostat"
          energy={{
            power: 'ha:sensor.office_heater_power',
            energy: 'ha:sensor.office_heater_energy',
          }}
        />
        <SceneButton entity="ha:scene.focus_mode" name="Focus Mode" />
      </Grid>
    </>
  );
}
