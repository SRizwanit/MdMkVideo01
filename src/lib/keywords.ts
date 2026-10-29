// গুরুত্বপূর্ণ শব্দ — শব্দের index (JSON-এর `index`) ধরে, যাতে একই শব্দ সব জায়গায় হাইলাইট না হয়।
export type Kind = "key" | "count" | "num" | "dua";

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const map = new Map<number, Kind>();
const put = (idx: number[], k: Kind) => idx.forEach((i) => map.set(i, k));

put([10, 11], "key"); // ইস্তেনজার সুন্নাত (শুরুর পরিচিতি)
put([40, 44, 48, 98, 102, 116, 122], "count"); // ১৬টি, ৪টি, ১২টি …
put([51, 57, 65, 85], "num"); // সুন্নাত নম্বর ১ ২ ৩ ৪
put([54, 55, 56], "key"); // মাথা ঢেকে রাখা
put([60, 62, 63], "key"); // স্যান্ডেল / জুতো / পরিধান
put([68, 69], "key"); // দোয়া পড়া
put(range(74, 84), "dua"); // দোয়ার উচ্চারণ
put([91, 92, 95], "key"); // বাম পা … প্রবেশ
put([126, 127], "key"); // MD MK

export const kindOf = (index: number): Kind | undefined => map.get(index);
