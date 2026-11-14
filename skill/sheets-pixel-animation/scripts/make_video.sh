#!/bin/zsh
# Usage: make_video.sh <frames_dir> <out.mp4> <w:h:x:y crop in CSS pixels of the 1788x1041 viewport>
# Frames are captured at device scale 2, so the crop is doubled here. Measure x/y/w/h on setup.png (CSS px).
F=${1:?frames}; O=${2:?out}; IFS=: read w h x y <<< "${3:?crop}"
python3 - "$F" <<'PY'
import json,sys
d=sys.argv[1]; ts=json.load(open(f"{d}/ts.json"))
with open(f"{d}/list.txt","w") as f:
  f.write("ffconcat version 1.0\n")
  for i,t in enumerate(ts):
    f.write(f"file 'f{i:04d}.jpg'\nduration {((ts[i+1]-t)/1000 if i+1<len(ts) else 0.1):.3f}\n")
  f.write(f"file 'f{len(ts)-1:04d}.jpg'\n")
PY
ffmpeg -y -loglevel error -f concat -safe 0 -i "$F/list.txt" -vf "crop=$((w*2)):$((h*2)):$((x*2)):$((y*2)),scale=${w}:${h}:flags=neighbor,fps=30,format=yuv420p" -c:v libx264 -crf 18 "$O"
ffmpeg -y -loglevel error -i "$O" -vf "fps=1/8,scale=480:-2,tile=4x2" -frames:v 1 "${O%.mp4}-sheet.jpg"
echo "$O"
