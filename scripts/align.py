#!/usr/bin/env python3
"""টাইমস্ট্যাম্প সংশোধন: আপনার শুদ্ধ লেখা + আসল অডিওর সময়।
usage: python scripts/align.py <video> <timestamps.json> <out_json> <reportdir> [--no-whisper]
ধাপ: (১) কণ্ঠ-এনভেলপ থেকে কথা বলার অংশ (২) Whisper (বাংলা) থেকে শব্দ-সময় (ঐচ্ছিক, অ্যাংকর)
     (৩) আপনার শব্দগুলো কথার অংশে বসানো — লেখা অপরিবর্তিত, শুধু সময় বদলায়।
"""
import json, re, subprocess, sys, wave, difflib
from pathlib import Path
import numpy as np

video, ts_in, ts_out, rdir = sys.argv[1:5]
use_whisper = "--no-whisper" not in sys.argv
rdir = Path(rdir); rdir.mkdir(parents=True, exist_ok=True)
rep = []
def log(s=""): print(s); rep.append(s)
def sec(t): m, s = t.split(":"); return int(m)*60+float(s)
def fmt(x): m = int(x//60); return f"{m:02d}:{x-60*m:05.2f}"

src = json.load(open(ts_in, encoding="utf-8")); words = src["word_timestamps"]
wav = rdir/"a.wav"
subprocess.run(["ffmpeg","-v","error","-y","-i",video,"-ac","1","-ar","16000",str(wav)], check=True)
w_ = wave.open(str(wav)); x = np.frombuffer(w_.readframes(w_.getnframes()), np.int16).astype(float)

# (১) কণ্ঠ অংশ, ২০ms গ্রিড
h = 320; n = len(x)//h
rms = np.sqrt(np.array([(x[i*h:(i+1)*h]**2).mean() for i in range(n)]))
on = rms > max(rms.max()*0.03, 200)
def close(mask, gap):  # gap ফ্রেমের চেয়ে ছোট ফাঁক ভরাট
    m = mask.copy(); i = 0
    while i < len(m):
        if not m[i]:
            j = i
            while j < len(m) and not m[j]: j += 1
            if 0 < i and j < len(m) and j-i < gap: m[i:j] = True
            i = j
        else: i += 1
    return m
on = close(on, 8)                       # <160ms ফাঁক = শব্দের ভিতরের বিরতি
iv, s0 = [], None
for i, b in enumerate(on):
    if b and s0 is None: s0 = i
    if not b and s0 is not None:
        if i-s0 >= 4: iv.append((s0*0.02, i*0.02))
        s0 = None
if s0 is not None: iv.append((s0*0.02, n*0.02))
cum = np.cumsum([0]+[b-a for a,b in iv])          # voiced-time সঞ্চয়
def T(t):                                          # real → voiced
    k = np.searchsorted([b for _,b in iv], t)
    if k >= len(iv): return cum[-1]
    a, b = iv[k]; return cum[k] + min(max(t-a,0), b-a)
def Tinv(v):                                       # voiced → real
    v = min(max(v,0), cum[-1]); k = max(np.searchsorted(cum, v, side="right")-1, 0)
    k = min(k, len(iv)-1); return iv[k][0] + (v-cum[k])
log(f"কণ্ঠ অংশ {len(iv)}টি | মোট কণ্ঠ {cum[-1]:.1f}s | {iv[0][0]:.2f}s → {iv[-1][1]:.2f}s")

# (২) Whisper অ্যাংকর
def norm(w): return re.sub(r"[^\wঀ-৿]", "", w)
ww = []
if use_whisper:
    from faster_whisper import WhisperModel
    m = WhisperModel("medium", device="cpu", compute_type="int8")
    segs, info = m.transcribe(str(wav), language="bn", word_timestamps=True, vad_filter=False, beam_size=5)
    for sg in segs:
        for w in sg.words: ww.append(dict(w=w.word.strip(), s=float(w.start), e=float(w.end)))
    json.dump(ww, open(rdir/"whisper_words.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
    open(rdir/"whisper_transcript.txt","w",encoding="utf-8").write(" ".join(d["w"] for d in ww))
    log(f"Whisper শব্দ {len(ww)}টি | শেষ শব্দ {ww[-1]['e']:.1f}s" if ww else "Whisper কিছু পায়নি")
U = [norm(w["word"]) for w in words]; Wn = [norm(d["w"]) for d in ww]
anchors = []   # (user_index_start, user_index_end, t_start, t_end)
if ww:
    sm = difflib.SequenceMatcher(None, U, Wn, autojunk=False)
    for blk in sm.get_matching_blocks():
        if blk.size >= 2:
            anchors.append((blk.a, blk.a+blk.size, ww[blk.b]["s"], ww[blk.b+blk.size-1]["e"]))
log(f"অ্যাংকর (≥২ শব্দ মিলেছে): {len(anchors)}টি, মোট {sum(b-a for a,b,_,_ in anchors)}/{len(U)} শব্দ")

# (৩) বসানো
def place(i0, i1, t0, t1, out):
    """words[i0:i1] কে [t0,t1] সময়ের কণ্ঠ-অংশে অক্ষর-ওজন অনুযায়ী বসাও"""
    if i0 >= i1: return
    v0, v1 = T(t0), T(t1)
    wt = np.array([len(U[i]) + 1.5 for i in range(i0,i1)]); c = np.concatenate([[0], np.cumsum(wt)])/wt.sum()
    for k, i in enumerate(range(i0,i1)):
        out[i] = (Tinv(v0 + c[k]*(v1-v0)), Tinv(v0 + c[k+1]*(v1-v0)))
out = {}
segs_ = []; prev_i, prev_t = 0, iv[0][0]
for a, b, ts, te in anchors:
    segs_.append((prev_i, a, prev_t, ts)); segs_.append((a, b, ts, te)); prev_i, prev_t = b, te
segs_.append((prev_i, len(U), prev_t, iv[-1][1]))
for i0, i1, t0, t1 in segs_:
    if t1 <= t0 and i0 < i1:       # অ্যাংকরের মাঝে জায়গা নেই — ছোট জানালা
        t1 = t0 + 0.2*(i1-i0)
    place(i0, i1, t0, t1, out)
# একক্রম ও ওভারল্যাপ ঠিক
prev = 0.0; res = []
for i, w in enumerate(words):
    s, e = out[i]; s = max(s, prev); e = max(e, s+0.08); prev = e
    d = dict(w); d["start_time"], d["end_time"] = fmt(s), fmt(e); d["start_sec"], d["end_sec"] = round(s,3), round(e,3)
    res.append(d)
new = dict(src); new["word_timestamps"] = res
new["audio_metadata"] = dict(src.get("audio_metadata",{}), aligned=True, aligned_duration_seconds=round(prev,2))
json.dump(new, open(ts_out,"w",encoding="utf-8"), ensure_ascii=False, indent=2)

# রিপোর্ট
sc = np.mean([ (lambda a,b: (on[int(a/0.02):int(b/0.02)].mean() if b>a else 0))(d["start_sec"], d["end_sec"]) > 0.5 for d in res ])
old = np.mean([ (lambda a,b: (on[int(a/0.02):int(b/0.02)].mean() if b>a else 0))(sec(w["start_time"]), sec(w["end_time"])) > 0.5 for w in words])
log(f"সিঙ্ক-স্কোর (কণ্ঠ আছে এমন শব্দ): আগে {old*100:.0f}% → এখন {sc*100:.0f}%")
log(f"আপনার শেষ শব্দ: আগে {sec(words[-1]['end_time']):.1f}s → এখন {prev:.1f}s | অডিওর শেষ কণ্ঠ {iv[-1][1]:.1f}s")
log("\nনমুনা (প্রতি ১৫তম শব্দ): আগে → এখন")
for i in range(0, len(res), 15):
    log(f"  {words[i]['word']:<14} {sec(words[i]['start_time']):6.2f} → {res[i]['start_sec']:6.2f}")
open(rdir/"align_report.txt","w",encoding="utf-8").write("\n".join(rep))
wav.unlink()
