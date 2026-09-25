import { Composition } from "remotion";
import { PuriUpdateReel } from "./reel";

export const Root = () => (
  <Composition
    id="PuriUpdateReel"
    component={PuriUpdateReel}
    durationInFrames={600}
    fps={30}
    width={1080}
    height={1920}
  />
);
