import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Amiri";
import { W } from "../lib/captions";
import { Box, VIDEO } from "../lib/zones";
import { theme } from "../theme";
import { Seg, SafeBox, bn, useSeg } from "./SafeBox";

const { fontFamily: arabicFont } = loadFont("normal", { weights: ["700"], subsets: ["arabic", "latin"] });

/** আরবি দোয়া দেখাতে চান না? false করুন। প্রকাশের আগে বানান/হরকত যাচাই করুন। */
export const SHOW_ARABIC = true;

// নিরাপদ বাক্স (ফ্রেমের অনুপাত): চেহারার ঠিক নিচে ও ক্যাপশনের উপরে; ক্যাপশনের নিচে
const BAND: Box = { x0: 0.05, x1: 0.95, y0: 0.53, y1: 0.612 };
const FOOT: Box = { x0: 0.1, x1: 0.9, y0: 0.9, y1: 0.97 };

const pill: React.CSSProperties = {
  background: "rgba(8,30,22,0.88)",
  border: "2px solid rgba(91,227,160,0.55)",
  borderRadius: 26,
  boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
  fontFamily: theme.fontFamily,
  fontWeight: 700,
  color: "#fff",
};

const Circle: React.FC<{ children: React.ReactNode; size?: number; color?: string }> = ({
  children,
  size = 78,
  color = theme.count,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: color,
      color: "#1b1200",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.62,
      fontFamily: theme.fontFamily,
      fontWeight: 700,
      flexShrink: 0,
      lineHeight: 1,
    }}
  >
    {children}
  </div>
);

/** ১. শুরুর শিরোনাম */
const TitleCard: React.FC = () => {
  const { enter, opacity } = useSeg();
  return (
    <SafeBox box={BAND} style={{ justifyContent: "center", opacity, transform: `scale(${0.9 + 0.1 * Math.min(enter, 1.05)})` }}>
      <div style={{ ...pill, padding: "10px 34px", textAlign: "center" }}>
        <div style={{ fontSize: 46, lineHeight: 1.25, color: theme.key }}>মসজিদ থেকে বের হওয়া</div>
        <div style={{ fontSize: 24, lineHeight: 1.2, opacity: 0.8 }}>সুন্নাত তরিকা</div>
      </div>
    </SafeBox>
  );
};

/** ২. সংখ্যা-চিপ: "মোট ১৬টি" ও "আজ ৪টি" */
const CountChip: React.FC<{ label: string; value: number; delay: number; color: string }> = ({
  label,
  value,
  delay,
  color,
}) => {
  const { local, enter, opacity } = useSeg(delay);
  const v = Math.round(interpolate(local, [0, 14], [0, value], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <div
      style={{
        ...pill,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "8px 26px 8px 12px",
        opacity: Math.min(opacity, interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" })),
        transform: `scale(${0.8 + 0.2 * Math.min(enter, 1.1)})`,
      }}
    >
      <Circle size={70} color={color}>
        {bn(v)}
      </Circle>
      <span style={{ fontSize: 38 }}>{label}</span>
    </div>
  );
};

const CountRow: React.FC<{ chips: { label: string; value: number; delay: number; color: string }[] }> = ({ chips }) => (
  <SafeBox box={BAND} style={{ justifyContent: "center", gap: 22 }}>
    {chips.map((c) => (
      <CountChip key={c.label} {...c} />
    ))}
  </SafeBox>
);

/** ৩. বিষয়-ব্যানার: সুন্নাত নং + নাম */
const Topic: React.FC<{ n: number; title: string }> = ({ n, title }) => {
  const { enter, opacity } = useSeg();
  return (
    <SafeBox box={BAND} style={{ justifyContent: "flex-start", opacity, transform: `translateX(${(1 - Math.min(enter, 1)) * -60}px)` }}>
      <div style={{ ...pill, display: "flex", alignItems: "center", gap: 18, padding: "8px 34px 8px 10px", width: "100%" }}>
        <Circle>{bn(n)}</Circle>
        <div>
          <div style={{ fontSize: 24, lineHeight: 1.15, opacity: 0.75 }}>সুন্নাত নং {bn(n)}</div>
          <div style={{ fontSize: 42, lineHeight: 1.25, color: theme.key }}>{title}</div>
        </div>
      </div>
    </SafeBox>
  );
};

/** ৪. আরবি দোয়া (ঐচ্ছিক) */
const Arabic: React.FC<{ text: string; size: number }> = ({ text, size }) => {
  const { enter, opacity } = useSeg();
  return (
    <SafeBox box={BAND} style={{ justifyContent: "center", opacity }}>
      <div
        style={{
          ...pill,
          background: "rgba(6,24,40,0.97)",
          border: "2px solid rgba(143,211,255,0.6)",
          width: "100%",
          padding: "4px 20px",
          direction: "rtl",
          textAlign: "center",
          fontFamily: arabicFont,
          fontSize: size,
          lineHeight: 1.75,
          whiteSpace: "nowrap",
          color: theme.dua,
          transform: `scale(${0.94 + 0.06 * Math.min(enter, 1)})`,
        }}
      >
        {text}
      </div>
    </SafeBox>
  );
};

/** ৫. সারাংশ-চেকলিস্ট */
const CheckItem: React.FC<{ n: number; label: string; delay: number }> = ({ n, label, delay }) => {
  const { local, enter, opacity } = useSeg(delay);
  const tick = interpolate(local, [4, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        ...pill,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 14px 6px 6px",
        fontSize: 22,
        opacity: Math.min(opacity, interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" })),
        transform: `translateY(${(1 - Math.min(enter, 1)) * 18}px)`,
      }}
    >
      <Circle size={40} color={theme.key}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#06261a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12.5 L10 18 L20 6" strokeDasharray="26" strokeDashoffset={26 * (1 - tick)} />
        </svg>
      </Circle>
      <span>{label}</span>
    </div>
  );
};

/** ৬. ব্র্যান্ড-ট্যাগ */
const Brand: React.FC = () => {
  const { enter, opacity } = useSeg();
  return (
    <SafeBox box={FOOT} style={{ justifyContent: "center", opacity, transform: `translateY(${(1 - Math.min(enter, 1)) * 30}px)` }}>
      <div style={{ ...pill, padding: "6px 34px", fontSize: 38, background: "rgba(8,30,22,0.92)" }}>
        <span style={{ color: theme.count }}>MD MK</span>-এর সাথে থাকুন
      </div>
    </SafeBox>
  );
};

/** ৭. প্রোগ্রেস-বার */
const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pct = (frame / durationInFrames) * 100;
  return (
    <SafeBox box={{ x0: 0, x1: 1, y0: 0.99, y1: 1 }} style={{ background: "rgba(255,255,255,0.18)" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: theme.key }} />
    </SafeBox>
  );
};

export const Graphics: React.FC = () => {
  // a = পয়েন্ট-নম্বর শব্দের index, b = পরের পয়েন্ট (বা পরের দৃশ্য) শুরুর শব্দের index
  const topics = [
    { n: 1, a: 36, b: 40, title: "বিসমিল্লাহ বলা" },
    { n: 2, a: 40, b: 46, title: "দরুদ শরীফ পাঠ করা" },
    { n: 3, a: 46, b: 57, title: "বের হওয়ার দোয়া করা" },
    { n: 4, a: 62, b: 71, title: "বাম পায়ে বের হওয়া" },
    { n: 5, a: 71, b: 84, title: "ডান পায়ের জুতো আগে পরা" },
  ];
  return (
    <AbsoluteFill>
      <Seg from={W(23).start - 0.25} to={W(28).end + 1.6}>
        <TitleCard />
      </Seg>

      <Seg from={W(35).start - 0.15} to={W(36).start - 0.2}>
        <CountRow chips={[{ label: "সুন্নাত তরিকা", value: 5, delay: 0, color: theme.count }]} />
      </Seg>

      {topics.map((t) => (
        <Seg key={t.n} from={W(t.a).start - 0.15} to={W(t.b).start - 0.17}>
          <Topic n={t.n} title={t.title} />
        </Seg>
      ))}

      {SHOW_ARABIC ? (
        <Seg from={W(57).start - 0.1} to={W(61).end + 0.2}>
          <Arabic text="اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ" size={40} />
        </Seg>
      ) : null}

      <Seg from={W(84).start - 0.1} to={W(92).end + 0.9}>
        <SafeBox box={BAND} style={{ justifyContent: "center", gap: 8 }}>
          <CheckItem n={1} label="বিসমিল্লাহ" delay={0} />
          <CheckItem n={2} label="দরুদ" delay={0.3} />
          <CheckItem n={3} label="দোয়া" delay={0.6} />
          <CheckItem n={4} label="বাম পা" delay={0.9} />
          <CheckItem n={5} label="ডান পা" delay={1.2} />
        </SafeBox>
      </Seg>

      <Seg from={W(102).start - 0.2} to={VIDEO.durationInFrames / VIDEO.fps}>
        <Brand />
      </Seg>

      <Progress />
    </AbsoluteFill>
  );
};
