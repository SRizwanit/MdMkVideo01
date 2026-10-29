import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { BasicCaption } from "./components/BasicCaption";
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
      <BasicCaption />
      {debug ? <Debug /> : null}
    </AbsoluteFill>
  );
};
