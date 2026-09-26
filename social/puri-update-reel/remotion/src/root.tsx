import { Fragment } from "react";
import { Composition } from "remotion";
import { PuriCover, PuriUpdateReel } from "./reel";

export const Root = () => (
  <Fragment>
    <Composition
    id="PuriUpdateReel"
    component={PuriUpdateReel}
    durationInFrames={600}
    fps={30}
    width={1080}
    height={1920}
    />
    <Composition
    id="PuriCover"
    component={PuriCover}
    durationInFrames={1}
    fps={30}
    width={1080}
    height={1920}
    />
  </Fragment>
);
