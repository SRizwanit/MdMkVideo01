// গুরুত্বপূর্ণ শব্দ — শব্দের index (JSON-এর `index`) ধরে, যাতে একই শব্দ সব জায়গায় হাইলাইট না হয়।
export type Kind = "key" | "count" | "num" | "dua";

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const map = new Map<number, Kind>();
const put = (idx: number[], k: Kind) => idx.forEach((i) => map.set(i, k));

put([23, 25, 26], "key"); // মসজিদ … বের হওয়ার (শিরোনাম, প্রথমবার)
put([35, 85], "count"); // পাঁচটি (২২ সে.), পাঁচটি (সারাংশ)
put([36, 40, 46, 62, 71], "num"); // এক, দুই, তিন, চার, পাঁচ (নম্বর শব্দ)
put([38], "key"); // বিসমিল্লাহ
put([42, 43], "key"); // দরুদ শরীফ
put([53], "key"); // দোয়া (বের হওয়ার দোয়া)
put(range(57, 61), "dua"); // আল্লাহুম্মা ইন্নি আসআলুকা মিন ফাদলিক
put([64, 65], "key"); // বাম পায়ে
put([79, 80, 81], "key"); // ডান পায়ের জুতো
put([95, 98], "key"); // সুন্নাহ, সুন্নাহ (শেষ আহ্বান)

export const kindOf = (index: number): Kind | undefined => map.get(index);
