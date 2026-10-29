import React from "react";
import { AbsoluteFill } from "remotion";
import { CAPTION, FACE, toPx } from "../lib/zones";

/** debug=true হলে চেহারা-নিষিদ্ধ (লাল) ও ক্যাপশন (সবুজ) এলাকা দেখায় */
export const Debug: React.FC = () => {
  const f = toPx(FACE);
  const c = toPx(CAPTION);
  const box = (b: typeof f, color: string, label: string) => (
    <div style={{ position: "absolute", ...b, border: `3px solid ${color}`, color, fontSize: 22, fontFamily: "monospace" }}>
      {label}
    </div>
  );
  return (
    <AbsoluteFill>
      {box(f, "#ff3b3b", "FACE-NO-GO")}
      {box(c, "#2ecc71", "CAPTION")}
    </AbsoluteFill>
  );
};
