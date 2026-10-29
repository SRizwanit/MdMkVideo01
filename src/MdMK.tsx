import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { Caption } from "./components/Caption";
import { Debug } from "./components/Debug";

export type MdMKProps = { debug: boolean };

export const MdMK: React.FC<MdMKProps> = ({ debug }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* মূল ভিডিও (৩৬০×৬৪০ → ৭২০×১২৮০, অডিওসহ) */}
      <OffthreadVideo
        src={staticFile("MdMK.mp4")}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <Caption />
      {debug ? <Debug /> : null}
    </AbsoluteFill>
  );
};
