import React, { createContext, useContext } from "react";
import { Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Box, FACE, intersects, toPx } from "../lib/zones";

/** নিরাপদ বাক্স: চেহারা-জোনে ঢুকলে রেন্ডার সাথে সাথে ফেল করে (চেহারায় কিছু আসার সুযোগ নেই) */
export const SafeBox: React.FC<{ box: Box; children: React.ReactNode; style?: React.CSSProperties }> = ({
  box,
  children,
  style,
}) => {
  if (intersects(box, FACE)) {
    throw new Error(`SafeBox চেহারা-জোনে ঢুকেছে: ${JSON.stringify(box)}`);
  }
  return (
    <div style={{ position: "absolute", ...toPx(box), display: "flex", alignItems: "center", ...style }}>
      {children}
    </div>
  );
};

const SegCtx = createContext(1);

/** সেকেন্ড ধরে সময়-খণ্ড: from → to পর্যন্ত দেখায় */
export const Seg: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({ from, to, children }) => {
  const { fps } = useVideoConfig();
  const f = Math.round(from * fps);
  const d = Math.max(2, Math.round(to * fps) - f);
  return (
    <Sequence from={f} durationInFrames={d} layout="none">
      <SegCtx.Provider value={d}>{children}</SegCtx.Provider>
    </Sequence>
  );
};

/** খণ্ডের ভিতরে: ঢোকা/বেরোনোর অ্যানিমেশন মান */
export const useSeg = (delaySec = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = useContext(SegCtx);
  const local = frame - Math.round(delaySec * fps);
  const enter = spring({ frame: local, fps, config: { damping: 14, stiffness: 170, mass: 0.7 } });
  const exit = interpolate(frame, [dur - 6, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = Math.min(1, interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" }), exit);
  return { frame, local, fps, dur, enter, exit, opacity };
};

export const bn = (n: number) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
