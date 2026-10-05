/** @jsxImportSource @emotion/react */
import { Box } from 'e-prim';

/** A picture (artwork, an avatar) that fills the box it is in, cropped to fit. Decorative: the
 * name of what it shows is always written beside it. */
export function Cover({ src }: { src: string }) {
  return <Box as="img" src={src} alt="" width="100%" height="100%" css={{ objectFit: 'cover' }} />;
}
