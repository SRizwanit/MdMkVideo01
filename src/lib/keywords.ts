// গুরুত্বপূর্ণ শব্দ — শব্দের index (JSON-এর `index`) ধরে, যাতে একই শব্দ সব জায়গায় হাইলাইট না হয়।
export type Kind = "key" | "count" | "num" | "dua";

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const map = new Map<number, Kind>();
const put = (idx: number[], k: Kind) => idx.forEach((i) => map.set(i, k));

put([11, 12], "key"); // ইস্তিঞ্জার সুন্নাত (শুরুর পরিচিতি)
put([13, 21, 93, 97, 102, 106], "count"); // ১৬টি, চারটি (আজকের), ১৬টি, চারটি, আটটি, আটটি
put([31, 43, 61, 73], "num"); // সুন্নাত নম্বর: এক, দুই, তিন, চার
put([34, 35], "key"); // কেবলার দিকে
put(range(53, 55), "key"); // বসে প্রস্রাব পায়খানা
put([64, 65], "key"); // নাপাক পানি
put([79, 81, 85], "key"); // ঢিলা, পানি, কুলুপ
put([110, 111], "key"); // এমডি এমকে

export const kindOf = (index: number): Kind | undefined => map.get(index);
