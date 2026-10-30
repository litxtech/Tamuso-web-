import json
import re

path = r"C:\Users\ilkse\.cursor\projects\c-Users-ilkse-muta\agent-transcripts\8077d089-59a5-4b3b-a6f0-4186da017052\8077d089-59a5-4b3b-a6f0-4186da017052.jsonl"
out = r"c:\Users\ilkse\muta\.cache\transcript_cloud_ses.txt"

needles = re.compile(
    r"cloud\s*ses|ses\s*bağlantısı\s*hata|ses\s*baglantisi\s*hata|"
    r"sesBaglantisiHata|MedyaBaglantisi|bağlantı\s*kurulamadı|"
    r"konuşmacı\s*bağlant|room.?connect|LiveKit.*(error|fail|timeout|disconnect|hata)|"
    r"intermittent|bir\s*ara|hata\s*vermem|cloud\s*bağlant|"
    r"ses\s*odas.{0,40}(hata|error|bağlan|cloud)|"
    r"canl[ıi].{0,40}(ses|cloud|bağlant|hata)",
    re.I,
)


def walk_text(obj, acc):
    if isinstance(obj, str):
        acc.append(obj)
    elif isinstance(obj, list):
        for x in obj:
            walk_text(x, acc)
    elif isinstance(obj, dict):
        for v in obj.values():
            walk_text(v, acc)


lines_out = []
with open(path, encoding="utf-8") as f:
    for i, line in enumerate(f, 1):
        try:
            o = json.loads(line)
        except Exception:
            continue
        texts = []
        walk_text(o, texts)
        blob = "\n".join(texts)
        if not needles.search(blob):
            continue
        role = "?"
        if isinstance(o.get("message"), dict):
            role = o["message"].get("role", "?")
        else:
            role = o.get("role") or o.get("type") or "?"
        # find all match windows
        matches = list(needles.finditer(blob))
        lines_out.append(f"\n{'='*80}\nline={i} role={role} matches={len(matches)} len={len(blob)}")
        # if this looks like THE user complaint or a diagnosis, dump more
        for m in matches[:8]:
            a = max(0, m.start() - 250)
            b = min(len(blob), m.end() + 350)
            sn = re.sub(r"\s+", " ", blob[a:b]).strip()
            lines_out.append("SNIP: " + sn[:700])

with open(out, "w", encoding="utf-8") as w:
    w.write("\n".join(lines_out))
print(f"wrote {out} blocks={len(lines_out)}")
