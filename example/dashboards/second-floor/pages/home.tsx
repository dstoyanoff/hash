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
        <LightTile entity="ha:light.master_bedroom_lamp" name="Night Lamp" />
        <ClimateTile entity="ha:climate.master_bedroom" name="Thermostat" />
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
        <LightTile entity="ha:light.bathroom_led" name="LED" icon="lu:sparkles" />
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
        <ClimateTile entity="ha:climate.office" name="Thermostat" />
        <SceneButton entity="ha:scene.focus_mode" name="Focus Mode" />
      </Grid>
    </>
  );
}
