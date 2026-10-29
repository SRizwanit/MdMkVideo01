import React from "react";
import { Composition } from "remotion";
import { MdMK, MdMKProps } from "./MdMK";
import { VIDEO } from "./lib/zones";

export const Root: React.FC = () => {
  return (
    <Composition
      id="MdMK"
      component={MdMK}
      width={VIDEO.width}
      height={VIDEO.height}
      fps={VIDEO.fps}
      durationInFrames={VIDEO.durationInFrames}
      defaultProps={{ debug: false } as MdMKProps}
    />
  );
};
