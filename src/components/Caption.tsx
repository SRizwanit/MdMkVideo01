import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { WINDOWS, Word } from "../lib/captions";
import { Kind, kindOf } from "../lib/keywords";
import { CAPTION, toPx } from "../lib/zones";
import { theme } from "../theme";

const KIND_COLOR: Record<Kind, string> = {
  key: theme.key,
  count: theme.count,
  num: theme.count,
  dua: theme.dua,
};

const WordView: React.FC<{ w: Word; t0: number }> = ({ w, t0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = t0 + frame / fps;
  const kind = kindOf(w.index);
  const isActive = t >= w.start && t < w.end + 0.05;
  const started = t >= w.start;

  // শব্দ শুরুর মুহূর্ত থেকে স্প্রিং
  const wf = Math.round((w.start - t0) * fps);
  const pop = spring({ frame: frame - wf, fps, config: { damping: 12, stiffness: 220, mass: 0.5 } });
  const big = kind === "num" || kind === "count" ? 0.22 : 0.12;
  const scale = isActive ? 1 + big * pop : 1;

  const color = kind ? KIND_COLOR[kind] : isActive ? theme.active : theme.text;
  const dim = !started && !kind ? 0.78 : 1;

  // হাইলাইটার-বার: শব্দ বলার সাথে বাড়ে
  const bar = kind
    ? interpolate(frame, [wf, wf + 7], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        margin: "0 9px",
        color,
        opacity: dim,
        transform: `scale(${scale})`,
        transformOrigin: "50% 70%",
        textShadow: isActive ? `0 0 22px ${color}88, 0 3px 10px rgba(0,0,0,0.7)` : "0 3px 10px rgba(0,0,0,0.7)",
      }}
    >
      {kind ? (
        <span
          style={{
            position: "absolute",
            left: 0,
            bottom: 6,
            height: 14,
            width: `${bar}%`,
            borderRadius: 7,
            background: `${KIND_COLOR[kind]}55`,
            zIndex: -1,
          }}
        />
      ) : null}
      {w.text}
    </span>
  );
};

const PageView: React.FC<{ index: number; t0: number; dur: number }> = ({ index, t0, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const page = WINDOWS[index].page;
  const enter = spring({ frame, fps, config: { damping: 15, stiffness: 190, mass: 0.6 } });
  const exit = interpolate(frame, [dur - 5, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = Math.min(interpolate(enter, [0, 1], [0, 1]), exit);
  const y = interpolate(enter, [0, 1], [18, 0]);
  const sc = interpolate(enter, [0, 1], [0.94, 1]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px) scale(${sc})`,
        background: theme.backdrop,
        borderRadius: 28,
        padding: "16px 24px 20px",
        textAlign: "center",
        fontFamily: theme.fontFamily,
        fontWeight: 700,
        fontSize: 60,
        lineHeight: 1.45,
        maxWidth: "100%",
      }}
    >
      {page.words.map((w) => (
        <WordView key={w.index} w={w} t0={t0} />
      ))}
    </div>
  );
};

/** পূর্ণ ক্যাপশন লেয়ার — শুধু নিচের নিরাপদ এলাকায় */
export const Caption: React.FC = () => {
  const { fps } = useVideoConfig();
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
        {WINDOWS.map((win, i) => {
          const from = Math.round(win.from * fps);
          const dur = Math.max(1, Math.round(win.to * fps) - from);
          return (
            <Sequence key={i} from={from} durationInFrames={dur} layout="none">
              <PageView index={i} t0={win.from} dur={dur} />
            </Sequence>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
