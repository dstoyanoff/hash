import { WeatherForecast } from '@hashsome/ui';
import { Flex } from 'e-prim';

// The page is the dashboard's own: a surface that fills the space and scrolls inside it, around the
// forecast. Change it as you like: a different background, two columns, other things beside it.
export default function Weather() {
  return (
    <Flex
      direction="column"
      background="surface"
      radius="card"
      p={5}
      grow={1}
      minHeight={0}
      overflow="auto"
    >
      <WeatherForecast entity="ha:weather.home" expanded />
    </Flex>
  );
}
