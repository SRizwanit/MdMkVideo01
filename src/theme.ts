import { loadFont } from "@remotion/google-fonts/HindSiliguri";

// বাংলা ফন্ট (Hind Siliguri) — রেন্ডারের আগে লোড হওয়া নিশ্চিত করে
const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["bengali", "latin"],
});

export const theme = {
  fontFamily,
  text: "#FFFFFF",
  dim: "rgba(255,255,255,0.55)",
  active: "#FFD84D", // এখন যে শব্দ বলা হচ্ছে
  key: "#5BE3A0", // গুরুত্বপূর্ণ শব্দ
  count: "#FFB84D", // সংখ্যা (১৬টি, ৪টি, ১২টি, ১ ২ ৩ ৪)
  dua: "#8FD3FF", // দোয়ার উচ্চারণ
  backdrop: "rgba(8,20,16,0.55)",
};
