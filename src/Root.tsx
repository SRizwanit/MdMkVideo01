import React from "react";
import { Audio, Composition, staticFile } from "remotion";
import { MdMK, MdMKProps } from "./MdMK";
import { VIDEO } from "./lib/zones";

// ফেজ ৭: MdMK কম্পোনেন্ট না বদলে তার পাশে SFX ট্র্যাক বসানো।
// public/sfx_track.wav তৈরি করে scripts/make_sfx.py (render.yml-এ স্বয়ংক্রিয়)।
// লোকাল Studio-তে ফাইল না থাকলে আগে `python3 scripts/make_sfx.py` চালান।
const MdMKWithSfx: React.FC<MdMKProps> = (props) => {
  return (
    <>
      <MdMK {...props} />
      <Audio src={staticFile("sfx_track.wav")} volume={1} />
    </>
  );
};

export const Root: React.FC = () => {
  return (
    <Composition
      id="MdMK"
      component={MdMKWithSfx}
      width={VIDEO.width}
      height={VIDEO.height}
      fps={VIDEO.fps}
      durationInFrames={VIDEO.durationInFrames}
      defaultProps={{ debug: false } as MdMKProps}
    />
  );
};
