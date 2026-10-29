#!/usr/bin/env python3
"""
make_sfx.py — MdMK ফেজ ৭: কোডে SFX তৈরি + একটি মিক্সড SFX ট্র্যাক বানানো।

কী করে:
  1. whoosh / pop / ding / tick / sparkle — numpy দিয়ে সংশ্লেষণ (কপিরাইট-মুক্ত, নিজস্ব শব্দ)
  2. src/sfx_cues.json পড়ে প্রতিটি cue-র সময় নির্ধারণ
       - "t": সরাসরি সেকেন্ড, অথবা
       - "match": সংশোধিত টাইমস্ট্যাম্প JSON-এর শব্দ মিলিয়ে সেই শব্দের start_sec
  3. সব মিলিয়ে public/sfx_track.wav (ভিডিওর পুরো দৈর্ঘ্য, স্টেরিও 44.1kHz 16-bit) লেখে
  4. out/sfx_report.txt — কোন cue কোন সময়ে বসল / কোনটা পাওয়া যায়নি

ভলিউম নিয়ম (বক্তার কণ্ঠ −১৩.৯ LUFS, peak −১.৫ dBFS):
  প্রতিটি শব্দ নিজে peak=1.0 এ নর্মালাইজ → BASE_DB (−২৪ dBFS) এ নামানো → cue-র gain_db যোগ।
  অর্থাৎ SFX কণ্ঠের চেয়ে ≈২০ dB নিচে। শেষে peak সীমা (−১২ dBFS) চেক; বেশি হলে নামিয়ে দেয়।

ব্যবহার:
  python3 scripts/make_sfx.py
  python3 scripts/make_sfx.py --words src/mdmk_timestamp.aligned.json --cues src/sfx_cues.json --duration 81.32
  python3 scripts/make_sfx.py --strict      # কোনো cue না মিললে exit 1
"""
import argparse
import json
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
BASE_DB = -24.0        # প্রতিটি SFX-এর ডিফল্ট peak (dBFS)
PEAK_LIMIT_DB = -12.0  # মিক্সড ট্র্যাকের সর্বোচ্চ peak
PUNCT = "।,?:—-.!\"'“”‘’()[]"


def db(x):
    return 10 ** (x / 20.0)


def fade(sig, ms=4):
    n = min(int(SR * ms / 1000), len(sig) // 2)
    if n > 0:
        ramp = np.linspace(0, 1, n)
        sig[:n] *= ramp
        sig[-n:] *= ramp[::-1]
    return sig


def norm(sig):
    m = np.max(np.abs(sig))
    return sig / m if m > 0 else sig


def t_axis(sec):
    return np.arange(int(SR * sec)) / SR


# ───────────── শব্দ সংশ্লেষণ ─────────────

def whoosh(sec=0.45):
    rng = np.random.default_rng(7)
    n = int(SR * sec)
    noise = rng.standard_normal(n)
    # কাটঅফ ৩০০ Hz → ৪০০০ Hz বাড়ে (one-pole low-pass, সময়-পরিবর্তনশীল)
    fc = np.linspace(300, 4000, n)
    alpha = 1 - np.exp(-2 * np.pi * fc / SR)
    out = np.zeros(n)
    y = 0.0
    for i in range(n):
        y += alpha[i] * (noise[i] - y)
        out[i] = y
    # ধীর অংশ বাদ দিয়ে হালকা "হাওয়া" ভাব
    slow = np.convolve(out, np.ones(400) / 400, mode="same")
    out = out - 0.8 * slow
    x = np.linspace(0, 1, n)
    env = np.sin(np.pi * x ** 0.8) ** 2
    return fade(norm(out * env))


def pop(sec=0.14):
    t = t_axis(sec)
    f = 520 * np.exp(-t * 14) + 160          # ৬৮০ → ১৬০ Hz ঝুঁকে পড়া
    phase = 2 * np.pi * np.cumsum(f) / SR
    env = np.exp(-t * 32)
    return fade(norm(np.sin(phase) * env))


def ding(sec=0.7):
    t = t_axis(sec)
    s = (np.sin(2 * np.pi * 1318.5 * t) * 1.0      # E6
         + np.sin(2 * np.pi * 1975.5 * t) * 0.45   # B6
         + np.sin(2 * np.pi * 2637.0 * t) * 0.2)   # E7
    env = np.exp(-t * 6.5) * (1 - np.exp(-t * 900))
    return fade(norm(s * env))


def tick(sec=0.05):
    t = t_axis(sec)
    s = np.sin(2 * np.pi * 2600 * t) + 0.4 * np.sin(2 * np.pi * 3900 * t)
    env = np.exp(-t * 120)
    return fade(norm(s * env), ms=1)


def sparkle(sec=0.9):
    rng = np.random.default_rng(11)
    n = int(SR * sec)
    out = np.zeros(n)
    for k in range(6):
        start = int(SR * (0.0 + k * 0.09 + rng.random() * 0.03))
        f = rng.choice([2093, 2349, 2637, 3136, 3520, 3951])
        L = int(SR * 0.25)
        tt = np.arange(L) / SR
        ping = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 18)
        end = min(n, start + L)
        out[start:end] += ping[: end - start] * (0.9 - k * 0.1)
    return fade(norm(out))


SOUNDS = {"whoosh": whoosh, "pop": pop, "ding": ding, "tick": tick, "sparkle": sparkle}


# ───────────── ফাইল / cue ─────────────

def write_wav(path, mono_or_stereo):
    arr = np.asarray(mono_or_stereo)
    if arr.ndim == 1:
        arr = np.stack([arr, arr], axis=1)
    pcm = np.clip(arr, -1, 1)
    pcm = (pcm * 32767).astype("<i2")
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def load_words(path):
    p = Path(path)
    if not p.exists():
        return []
    d = json.loads(p.read_text(encoding="utf-8"))
    if isinstance(d, dict):
        for k in ("words", "segments", "data", "items"):
            if isinstance(d.get(k), list):
                d = d[k]
                break
    out = []
    for w in d if isinstance(d, list) else []:
        if not isinstance(w, dict):
            continue
        text = next((w[k] for k in ("word", "text", "token", "w") if isinstance(w.get(k), str)), None)
        start = next((w[k] for k in ("start_sec", "start") if isinstance(w.get(k), (int, float))), None)
        if text is None or start is None:
            continue
        out.append((text.strip(PUNCT + " "), float(start)))
    return out


def resolve(cue, words):
    """cue → সেকেন্ডের তালিকা (খালি = পাওয়া যায়নি)"""
    offsets = cue.get("offsets", [0.0])
    base_off = float(cue.get("offset", 0.0))
    if "t" in cue:
        return [float(cue["t"]) + base_off + o for o in offsets]
    pats = cue.get("match")
    if pats is None:
        return []
    pats = [pats] if isinstance(pats, str) else pats
    hits = [s for (txt, s) in words if any(p in txt for p in pats)]
    nth = int(cue.get("nth", 1))
    if not hits:
        return []
    idx = nth - 1 if nth > 0 else nth
    if idx >= len(hits) or idx < -len(hits):
        return []
    return [hits[idx] + base_off + o for o in offsets]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--words", default="src/mdmk_timestamp.aligned.json")
    ap.add_argument("--cues", default="src/sfx_cues.json")
    ap.add_argument("--duration", type=float, default=81.32)
    ap.add_argument("--out", default="public/sfx_track.wav")
    ap.add_argument("--sfx-dir", default="public/sfx")
    ap.add_argument("--report", default="out/sfx_report.txt")
    ap.add_argument("--strict", action="store_true")
    a = ap.parse_args()

    # ১) আলাদা SFX ফাইল (peak −২৪ dBFS)
    bank = {}
    for name, fn in SOUNDS.items():
        sig = fn() * db(BASE_DB)
        bank[name] = sig
        write_wav(Path(a.sfx_dir) / f"{name}.wav", sig)

    # ২) cue পড়া
    cues = json.loads(Path(a.cues).read_text(encoding="utf-8"))
    cues = cues["cues"] if isinstance(cues, dict) else cues
    words = load_words(a.words)

    total = int(SR * a.duration)
    track = np.zeros(total)
    lines, missing = [], 0
    lines.append(f"words loaded: {len(words)} from {a.words}")
    lines.append(f"duration: {a.duration}s   base: {BASE_DB} dBFS   peak limit: {PEAK_LIMIT_DB} dBFS")
    lines.append("")

    for c in cues:
        name = c["sfx"]
        label = c.get("label", name)
        times = resolve(c, words)
        if not times:
            missing += 1
            lines.append(f"MISSING  {name:8s} {label}  (match={c.get('match')} nth={c.get('nth', 1)})")
            continue
        g = db(float(c.get("gain_db", 0.0)))
        for t in times:
            t = max(0.0, t)
            i = int(SR * t)
            sig = bank[name] * g
            j = min(total, i + len(sig))
            if i >= total:
                continue
            track[i:j] += sig[: j - i]
            lines.append(f"OK       {name:8s} {t:7.2f}s  {label}")

    # ৩) peak সীমা
    peak = float(np.max(np.abs(track))) if track.size else 0.0
    peak_db = 20 * np.log10(peak) if peak > 0 else -120.0
    if peak_db > PEAK_LIMIT_DB:
        track *= db(PEAK_LIMIT_DB) / peak
        lines.append(f"\npeak {peak_db:.1f} dBFS ছিল → {PEAK_LIMIT_DB} dBFS-এ নামানো হয়েছে")
        peak_db = PEAK_LIMIT_DB
    rms = float(np.sqrt(np.mean(track ** 2))) if track.size else 0.0
    lines.append(f"\nSFX ট্র্যাক peak: {peak_db:.1f} dBFS   (কণ্ঠ peak ≈ −1.5 dBFS)")
    lines.append(f"cue পাওয়া যায়নি: {missing} / {len(cues)}")

    write_wav(Path(a.out), track)
    rp = Path(a.report)
    rp.parent.mkdir(parents=True, exist_ok=True)
    rp.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    print(f"\nলেখা হয়েছে: {a.out}")

    if missing and a.strict:
        sys.exit(1)


if __name__ == "__main__":
    main()
