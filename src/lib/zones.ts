// ভিডিওর মাপ ও "চেহারা-ফ্রি" নিরাপদ জোন (পূর্ণ ফ্রেমের অনুপাত ০–১)
// মান এসেছে analysis/face-zone.json থেকে (OpenCV) + মাথা ঝুঁকলে নিরাপত্তার মার্জিন।
export const VIDEO = {
  width: 720,
  height: 1280,
  fps: 25,
  durationInFrames: 1604, // ৬৪.১৬ সে. × ২৫
};

export type Box = { x0: number; y0: number; x1: number; y1: number };

/** এই বাক্সের ভিতরে কোনো লেখা/গ্রাফিক্স আসবে না */
export const FACE: Box = { x0: 0.08, y0: 0.03, x1: 0.8, y1: 0.52 };

/** ক্যাপশন এই এলাকায় থাকবে */
export const CAPTION: Box = { x0: 0.05, y0: 0.62, x1: 0.95, y1: 0.88 };

export const toPx = (b: Box) => ({
  left: b.x0 * VIDEO.width,
  top: b.y0 * VIDEO.height,
  width: (b.x1 - b.x0) * VIDEO.width,
  height: (b.y1 - b.y0) * VIDEO.height,
});

export const intersects = (a: Box, b: Box) =>
  a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
