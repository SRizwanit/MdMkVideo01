#!/usr/bin/env python3
"""MdMK analyzer: video info, timestamp JSON check, speech-vs-timestamp drift, face zone, loudness.
usage: python scripts/analyze.py <video.mp4> <timestamps.json> <outdir>
"""
import json, re, subprocess, sys, wave
from pathlib import Path
import numpy as np
import cv2

video, ts_path, out = sys.argv[1], sys.argv[2], Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)
(out / "frames").mkdir(exist_ok=True)
rep, res = [], {}
def log(s=""): print(s); rep.append(s)
def run(cmd): return subprocess.run(cmd, capture_output=True, text=True)

# 1. ffprobe -----------------------------------------------------------------
p = json.loads(run(["ffprobe","-v","error","-print_format","json","-show_streams","-show_format",video]).stdout)
v = next(s for s in p["streams"] if s["codec_type"]=="video")
a = next((s for s in p["streams"] if s["codec_type"]=="audio"), None)
W, H = int(v["width"]), int(v["height"])
num, den = map(int, v["r_frame_rate"].split("/")); fps = num/den
dur = float(p["format"]["duration"])
res["video"] = dict(width=W, height=H, fps=fps, duration=dur, size_mb=round(int(p["format"]["size"])/1e6,2),
                    audio=bool(a), audio_channels=a and a.get("channels"))
log("== ১. ভিডিও ==")
log(f"রেজুলিউশন {W}x{H} | fps {fps:g} | দৈর্ঘ্য {dur:.2f}s | সাইজ {res['video']['size_mb']} MB | অডিও {'আছে' if a else 'নেই'}")
log(f"অনুপাত {W/H:.3f} ({'পোর্ট্রেট ৯:১৬' if abs(W/H-9/16)<0.01 else 'অন্য'})")

# 2. timestamp JSON ----------------------------------------------------------
def sec(t):
    m, s = t.split(":"); return int(m)*60+float(s)
j = json.load(open(ts_path, encoding="utf-8"))
words = j["word_timestamps"]
log("\n== ২. টাইমস্ট্যাম্প JSON ==")
log(f"শব্দ সংখ্যা {len(words)} | মেটাডেটা দৈর্ঘ্য {j['audio_metadata'].get('estimated_duration_seconds')}s")
bad, gaps, overl = [], [], []
prev_end = 0
for i, w in enumerate(words):
    s, e = sec(w["start_time"]), sec(w["end_time"])
    if e <= s: bad.append(w["index"])
    if s < prev_end - 1e-6: overl.append((w["index"], round(prev_end-s,2)))
    if s - prev_end > 0.7: gaps.append((w["index"], round(prev_end,2), round(s,2)))
    prev_end = e
ts_end = prev_end
log(f"প্রথম শব্দ শুরু {sec(words[0]['start_time']):.2f}s | শেষ শব্দ শেষ {ts_end:.2f}s")
log(f"শুরু≥শেষ ভুল: {bad or 'নেই'} | ওভারল্যাপ: {overl or 'নেই'} | ০.৭s+ ফাঁক: {gaps or 'নেই'}")
res["timestamps"] = dict(words=len(words), end=ts_end, bad=bad, overlaps=overl, big_gaps=gaps)

# 3. অডিও এনভেলপ (কথা বলার অংশ) ----------------------------------------------
wav = out / "a.wav"
run(["ffmpeg","-v","error","-y","-i",video,"-ac","1","-ar","16000",str(wav)])
w_ = wave.open(str(wav)); x = np.frombuffer(w_.readframes(w_.getnframes()), np.int16).astype(float)
h = 1600; n = len(x)//h
rms = np.array([np.sqrt((x[i*h:(i+1)*h]**2).mean()) for i in range(n)])
th = max(rms.max()*0.03, 200); on = rms > th
runs, s0 = [], None
for i, b in enumerate(on):
    if b and s0 is None: s0 = i
    if not b and s0 is not None: runs.append([s0,i]); s0 = None
if s0 is not None: runs.append([s0,n])
merged = []
for a_, b_ in runs:
    if merged and a_-merged[-1][1] < 3: merged[-1][1] = b_
    else: merged.append([a_,b_])
speech = [(round(a_/10,1), round(b_/10,1)) for a_,b_ in merged]
sp_start, sp_end = speech[0][0], speech[-1][1]
log("\n== ৩. আসল কথা বলার সময় বনাম JSON ==")
log(f"আসল কথা: {sp_start}s → {sp_end}s | JSON: {sec(words[0]['start_time']):.1f}s → {ts_end:.1f}s")
drift = sp_end - ts_end
log(f"শেষ প্রান্তে পার্থক্য ≈ {drift:+.1f}s ({'JSON আসল অডিওর সাথে মেলে না → সময় সংশোধন (align) দরকার' if abs(drift)>1.5 else 'মোটামুটি মেলে'})")
# JSON-এর ফাঁকে কি আসলে কথা চলছে?
mism = 0
for g in gaps[:0]: pass
sil = ~on
def voiced(t0, t1): 
    i0, i1 = int(t0*10), int(t1*10); return on[i0:i1].mean() if i1>i0 else 0
chk = []
for w in words:
    s, e = sec(w["start_time"]), sec(w["end_time"])
    chk.append(voiced(s, e))
score = float(np.mean(np.array(chk) > 0.5))
log(f"JSON-এর শব্দ-সময়ের ভিতরে আসলে কণ্ঠ আছে এমন শব্দ: {score*100:.0f}% (৯০%+ হলে সিঙ্ক ভালো)")
res["speech"] = dict(runs=speech, start=sp_start, end=sp_end, drift_end=drift, sync_score=score)
log("কথার অংশগুলো: " + ", ".join(f"{a_}-{b_}" for a_,b_ in speech))

# 4. লাউডনেস -----------------------------------------------------------------
r = run(["ffmpeg","-hide_banner","-i",video,"-af","ebur128=peak=true","-f","null","-"]).stderr
lufs = re.findall(r"I:\s+(-?[\d.]+) LUFS", r); peak = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r)
log("\n== ৪. লাউডনেস ==")
log(f"Integrated {lufs[-1] if lufs else '?'} LUFS | True peak {peak[-1] if peak else '?'} dBFS")
res["loudness"] = dict(lufs=lufs[-1] if lufs else None, peak=peak[-1] if peak else None)

# 5. ফ্রেম + চেহারার জোন ----------------------------------------------------------
log("\n== ৫. চেহারার নিরাপদ জোন ==")
cap = cv2.VideoCapture(video)
cas = []
try:
    base = cv2.data.haarcascades
    for f in ("haarcascade_frontalface_alt2.xml","haarcascade_frontalface_default.xml","haarcascade_profileface.xml"):
        c = cv2.CascadeClassifier(base+f)
        if not c.empty(): cas.append(c)
except Exception as e:
    log(f"⚠️ Haar লোড ব্যর্থ ({type(e).__name__})")
if not cas: log("⚠️ Haar মডেল পাওয়া যায়নি → ফলব্যাক জোন ব্যবহার হবে")
boxes, step = [], max(1,int(fps*0.5)); fi = 0
while True:
    ok, fr = cap.read()
    if not ok: break
    if fi % step == 0:
        g = cv2.equalizeHist(cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY))
        best = None
        for c in cas:
            f = c.detectMultiScale(g, 1.1, 5, minSize=(int(W*0.12),)*2)
            if len(f):
                best = max(f, key=lambda b: b[2]*b[3]); break
        if best is not None and best[1] < H*0.6: boxes.append(best)
    fi += 1
log(f"চেহারা পাওয়া গেছে {len(boxes)} ফ্রেমে")
if len(boxes) >= 10:
    b = np.array(boxes, float)
    x0 = np.percentile(b[:,0],5); y0 = np.percentile(b[:,1],5)
    x1 = np.percentile(b[:,0]+b[:,2],95); y1 = np.percentile(b[:,1]+b[:,3],95)
    src = "OpenCV"
else:  # ফলব্যাক: ছবি দেখে আনুমানিক (পূর্ণ ফ্রেমের শতাংশ)
    x0,y0,x1,y1 = W*0.17, H*0.08, W*0.72, H*0.52; src = "fallback"
# মার্জিন: চুল/থুতনি/হাত নড়াচড়ার জন্য — মাথার উপরে ও পাশে বেশি
mx, mt, mb = W*0.05, H*0.04, H*0.04
x0, y0, x1, y1 = max(0,x0-mx), max(0,y0-mt), min(W,x1+mx), min(H,y1+mb)
face = dict(source=src, x0=x0/W, y0=y0/H, x1=x1/W, y1=y1/H)
log(f"face-zone ({src}): x {face['x0']:.2f}–{face['x1']:.2f}, y {face['y0']:.2f}–{face['y1']:.2f} (পূর্ণ ফ্রেমের অনুপাত)")
caption = dict(x0=0.05, x1=0.95, y0=max(face["y1"]+0.08, 0.62), y1=0.88)
top = dict(x0=0.05, x1=0.95, y0=0.01, y1=face["y0"]-0.01) if face["y0"] >= 0.06 else None
log(f"প্রস্তাবিত ক্যাপশন এলাকা y {caption['y0']:.2f}–{caption['y1']:.2f} | উপরের স্ট্রিপ: " + (f"y {top['y0']:.2f}–{top['y1']:.2f}" if top else "নেই (মাথা ফ্রেমের উপরের কাছে)"))
res["zones"] = dict(face=face, caption=caption, top_strip=top)
json.dump(dict(width=W,height=H,fps=fps,duration=dur,**res["zones"]), open(out/"face-zone.json","w"), indent=2)

# অ্যানোটেটেড নমুনা ফ্রেম
for t in [1,10,20,30,40,50,60,70,78]:
    if t >= dur: continue
    cap.set(cv2.CAP_PROP_POS_MSEC, t*1000); ok, fr = cap.read()
    if not ok: continue
    def R(z, col, label):
        p0 = (int(z["x0"]*W), int(z["y0"]*H)); p1 = (int(z["x1"]*W), int(z["y1"]*H))
        cv2.rectangle(fr, p0, p1, col, 2); cv2.putText(fr, label, (p0[0]+4,p0[1]+16), cv2.FONT_HERSHEY_SIMPLEX, .5, col, 1)
    R(face,(0,0,255),"FACE-NO-GO"); R(caption,(0,200,0),"CAPTION"); top and R(top,(255,160,0),"TOP")
    cv2.imwrite(str(out/"frames"/f"t{t:02d}.jpg"), fr)
sheet = [cv2.imread(str(f)) for f in sorted((out/"frames").glob("t*.jpg"))]
if sheet:
    while len(sheet)%3: sheet.append(np.zeros_like(sheet[0]))
    rows = [np.hstack(sheet[i:i+3]) for i in range(0,len(sheet),3)]
    cv2.imwrite(str(out/"contact_sheet.jpg"), np.vstack(rows))
res["verdict"] = dict(needs_alignment=abs(drift)>1.5 or score<0.9)
log("\n== সিদ্ধান্ত ==")
log("টাইমস্ট্যাম্প সংশোধন (ফেজ ১.৩ → forced alignment) দরকার: " + ("হ্যাঁ" if res["verdict"]["needs_alignment"] else "না"))
json.dump(res, open(out/"analysis.json","w"), ensure_ascii=False, indent=2)
open(out/"analysis.txt","w",encoding="utf-8").write("\n".join(rep))
wav.unlink()
