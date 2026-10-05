/** @jsxImportSource @emotion/react */
import {
  ActionButton,
  Grid,
  LightTile,
  MediaPlayerColumn,
  RoomHeader,
  SceneButton,
  SensorReadout,
} from '@hashsome/ui';
import { Flex } from 'e-prim';
import { HomeTopBar } from '../../../shared/top-bar.tsx';

export const meta = () => [{ title: 'Kitchen' }];

export default function Home() {
  return (
    <>
      <HomeTopBar title="Kitchen" />
      {/* The rooms on the left; the player gets a column of its own on the right. */}
      <Flex grow={1} minHeight={0} gap={3}>
        <Flex direction="column" grow={1} minWidth={0} overflow="auto" gap={3}>
          <RoomHeader
            title="Kitchen"
            icon="lu:utensils-crossed"
            readouts={
              <>
                <SensorReadout entity="ha:sensor.kitchen_temperature" />
                <SensorReadout entity="ha:sensor.kitchen_humidity" />
              </>
            }
          />
          <Grid columns={3}>
            <LightTile entity="ha:light.kitchen_ceiling" name="Ceiling" />
            <LightTile entity="ha:light.kitchen_led" name="Under-Cabinet" />
            <LightTile entity="ha:light.kitchen_island" name="Island Pendant" />
          </Grid>

          <RoomHeader title="Appliances" />
          <Grid columns={3}>
            <ActionButton
              label="Coffee Maker"
              icon="lu:coffee"
              entity="ha:switch.kitchen_coffee_maker"
            />
            <ActionButton label="Exhaust Fan" icon="tb:car-fan" entity="ha:fan.kitchen_exhaust" />
            <SceneButton entity="ha:scene.cooking_time" name="Cooking Time" />
          </Grid>
        </Flex>
        <Flex css={{ flex: '0 0 28%', minWidth: 280, alignSelf: 'flex-start' }}>
          <MediaPlayerColumn entity="ma:kitchen" />
        </Flex>
      </Flex>
    </>
  );
}
