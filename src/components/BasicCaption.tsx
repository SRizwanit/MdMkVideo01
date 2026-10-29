import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { pageAt } from "../lib/captions";
import { CAPTION, toPx } from "../lib/zones";
import { theme } from "../theme";

/** সাময়িক সরল ক্যাপশন (ফেজ ৪-এ সম্পূর্ণ ডিজাইন আসবে) */
export const BasicCaption: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const page = pageAt(t);
  if (!page) return null;
  const z = toPx(CAPTION);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: z.left,
          top: z.top,
          width: z.width,
          height: z.height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: theme.backdrop,
            borderRadius: 24,
            padding: "14px 26px",
            textAlign: "center",
            fontFamily: theme.fontFamily,
            fontWeight: 700,
            fontSize: 58,
            lineHeight: 1.25,
            textShadow: "0 3px 10px rgba(0,0,0,0.6)",
          }}
        >
          {page.words.map((w) => {
            const state = t >= w.end ? "done" : t >= w.start ? "active" : "next";
            const color = state === "active" ? theme.active : state === "done" ? theme.dim : theme.text;
            return (
              <span key={w.index} style={{ color, marginRight: 14, display: "inline-block" }}>
                {w.text}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
