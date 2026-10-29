import raw from "../mdmk_timestamp.aligned.json";
import { VIDEO } from "./zones";

export type Word = { index: number; text: string; start: number; end: number };
export type Page = { words: Word[]; start: number; end: number };

type RawWord = { index: number; word: string; start_sec: number; end_sec: number };

export const WORDS: Word[] = (raw.word_timestamps as RawWord[]).map((w) => ({
  index: w.index,
  text: w.word,
  start: w.start_sec,
  end: w.end_sec,
}));

const ENDS_PHRASE = /[।,?:—!]$/;

/** শব্দ → ক্যাপশন পেজ: যতিচিহ্ন, বিরতি বা সর্বোচ্চ শব্দসংখ্যায় ভাঙা */
export const buildPages = (maxWords = 4, gap = 0.3): Page[] => {
  const pages: Page[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) {
      pages.push({ words: cur, start: cur[0].start, end: cur[cur.length - 1].end });
      cur = [];
    }
  };
  WORDS.forEach((w, i) => {
    if (cur.length && w.start - cur[cur.length - 1].end > gap) flush();
    cur.push(w);
    const next = WORDS[i + 1];
    if (ENDS_PHRASE.test(w.text) || cur.length >= maxWords || (next && next.start - w.end > gap)) flush();
  });
  flush();
  return pages;
};

export const PAGES = buildPages();

export const toFrame = (sec: number) => Math.round(sec * VIDEO.fps);

export type PageWindow = { page: Page; from: number; to: number };

/** প্রতিটি পেজ কখন থেকে কখন পর্দায় থাকবে (সেকেন্ড): ০.১৫ সে. আগে থেকে, বিরতিতে ০.৩ সে. ধরে */
export const WINDOWS: PageWindow[] = PAGES.map((p, i) => {
  const prev = PAGES[i - 1];
  const next = PAGES[i + 1];
  const from = Math.max(0, p.start - 0.15, prev ? prev.end + 0.02 : 0);
  const to = Math.min(p.end + 0.3, next ? next.start - 0.15 : Infinity, VIDEO.durationInFrames / VIDEO.fps);
  return { page: p, from, to: Math.max(to, from + 0.2) };
});

/** শব্দ নম্বর (JSON-এর `index`, ১ থেকে) ধরে শব্দ */
export const W = (index: number): Word => WORDS[index - 1];
