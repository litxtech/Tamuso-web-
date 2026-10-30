import json
import re
import sys

path = r"C:\Users\ilkse\.cursor\projects\c-Users-ilkse-muta\agent-transcripts\8077d089-59a5-4b3b-a6f0-4186da017052\8077d089-59a5-4b3b-a6f0-4186da017052.jsonl"
out_path = r"c:\Users\ilkse\muta\.cache\transcript_audio_hits.txt"

# Stronger relevance: audio connection / LiveKit / cloud ses issues
strong = re.compile(
    r"(ses\s*bağlant|ses\s*baglant|bağlantı\s*hatası|baglanti\s*hatasi|"
    r"cloud\s*(audio|ses|bağlant|baglant)|"
    r"LiveKit|"
    r"voice\s*room|"
    r"ses\s*bağlanıyor|ses\s*baglaniyor|"
    r"konuşmacı\s*bağlant|konusmaci\s*baglant|"
    r"intermittent.*(audio|ses|bağlant|livekit|cloud)|"
    r"(audio|ses|livekit|cloud).{0,40}(intermittent|hata|error|fail|kop|disconnect))",
    re.I,
)

# Also catch user complaints about cloud connection failing intermittently
soft = re.compile(
    r"(cloud.{0,30}(bağlan|baglan|hata|error|fail)|"
    r"(bağlan|baglan).{0,30}cloud|"
    r"ses\s*odas|canl[ıi]\s*yay[ıi]n|"
    r"livekit|webrtc)",
    re.I,
)


def texts_from(obj):
    out = []
    if obj is None:
        return out
    if isinstance(obj, str):
        out.append(obj)
        return out
    if isinstance(obj, list):
        for x in obj:
            out.extend(texts_from(x))
        return out
    if isinstance(obj, dict):
        for k in ("text", "content", "query", "result", "thinking", "message"):
            if k in obj:
                out.extend(texts_from(obj[k]))
        # avoid dumping huge tool payloads unless they match
    return out


def role_of(o):
    if isinstance(o.get("message"), dict) and o["message"].get("role"):
        return o["message"]["role"]
    return o.get("role") or o.get("type") or "?"


hits = []
with open(path, encoding="utf-8") as f:
    for i, line in enumerate(f, 1):
        try:
            o = json.loads(line)
        except Exception:
            continue
        role = role_of(o)
        blob = "\n".join(texts_from(o))
        if not strong.search(blob) and not soft.search(blob):
            continue
        # Prefer strong matches; keep soft only if also mentions error-ish terms
        is_strong = bool(strong.search(blob))
        if not is_strong:
            if not re.search(r"hata|error|fail|kop|bağlan|baglan|intermittent", blob, re.I):
                continue
        # Extract strong match windows
        snippets = []
        for rx in (strong, soft):
            for m in rx.finditer(blob):
                start = max(0, m.start() - 200)
                end = min(len(blob), m.end() + 280)
                sn = re.sub(r"\s+", " ", blob[start:end]).strip()
                if sn not in snippets:
                    snippets.append(sn)
        # For user/assistant, also store a longer focused excerpt around first strong match
        excerpt = ""
        m = strong.search(blob) or soft.search(blob)
        if m:
            start = max(0, m.start() - 400)
            end = min(len(blob), m.end() + 700)
            excerpt = re.sub(r"\s+", " ", blob[start:end]).strip()
        hits.append(
            {
                "line": i,
                "role": role,
                "strong": is_strong,
                "len": len(blob),
                "snippets": snippets[:6],
                "excerpt": excerpt[:1200],
            }
        )

# Filter to user/assistant mostly, and strong first
user_asst = [h for h in hits if h["role"] in ("user", "assistant", "human", "ai")]
others = [h for h in hits if h not in user_asst]

with open(out_path, "w", encoding="utf-8") as out:
    out.write(f"TOTAL_HITS={len(hits)} USER_ASST={len(user_asst)} OTHER={len(others)}\n")
    for h in hits:
        out.write("\n" + "=" * 80 + "\n")
        out.write(f"line={h['line']} role={h['role']} strong={h['strong']} len={h['len']}\n")
        out.write("EXCERPT: " + h["excerpt"] + "\n")
        for s in h["snippets"][:4]:
            out.write("SNIP: " + s[:500] + "\n")

print(f"Wrote {out_path} hits={len(hits)}")
