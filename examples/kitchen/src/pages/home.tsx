import {
  ActionButton,
  Dashboard,
  LightTile,
  mdiCoffee,
  mdiFan,
  mdiSilverwareForkKnife,
  SceneButton,
  Screen,
  Section,
  SensorReadout,
} from '@hash/ui';

export default function Home() {
  return (
    <Dashboard>
      <Screen viewport={{ width: 1024, height: 768 }} scroll>
        <Section
          title="kitchen"
          icon={mdiSilverwareForkKnife}
          readouts={
            <>
              <SensorReadout entity="ha:sensor.kitchen_temperature" />
              <SensorReadout entity="ha:sensor.kitchen_humidity" />
            </>
          }
          columns={3}
        >
          <LightTile entity="ha:light.kitchen_ceiling" name="ceiling" />
          <LightTile entity="ha:light.kitchen_led" name="under-cabinet" />
          <LightTile entity="ha:light.kitchen_island" name="island pendant" />
        </Section>

        <Section title="appliances" columns={3}>
          <ActionButton
            label="coffee maker"
            icon={mdiCoffee}
            action={{
              domain: 'switch',
              service: 'turn_on',
              entity: 'ha:switch.kitchen_coffee_maker',
            }}
          />
          <ActionButton
            label="exhaust fan"
            icon={mdiFan}
            action={{ domain: 'fan', service: 'turn_on', entity: 'ha:fan.kitchen_exhaust' }}
          />
          <SceneButton entity="ha:scene.cooking_time" name="cooking time" />
        </Section>
      </Screen>
    </Dashboard>
  );
}
