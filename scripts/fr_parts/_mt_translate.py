#!/usr/bin/env python3
"""Batch-translate EN locale leaves to French via MyMemory. Preserves {{placeholders}}."""
from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FLAT_EN = ROOT / "scripts" / "fr_parts" / "_flat_en.json"
CACHE = ROOT / "scripts" / "fr_parts" / "_mt_cache_fr.json"
OUT_FLAT = ROOT / "scripts" / "fr_parts" / "_flat_fr.json"

# Values that should stay as-is (brands, codes, short symbols)
KEEP_AS_IS = {
    "OK",
    "WhatsApp",
    "Tamuso",
    "PK",
    "ZEUS",
    "NOX",
    "Stripe",
    "LiveKit",
    "VIP",
    "PDF",
    "Excel",
    "CRM",
    "IBAN",
    "KYC",
    "iOS",
    "Android",
    "BPM",
    "QR",
    "demo",
    "combo",
    "Karaoke",
    "Story",
    "Master",
    "SHA",
    "N/A",
    "ID",
    "URL",
    "API",
    "SMS",
    "PIN",
    "USD",
    "EUR",
    "TRY",
}

PLACEHOLDER_RE = re.compile(r"\{\{[^}]+\}\}")
TAG_RE = re.compile(r"<[^>]+>")


def protect(s: str) -> tuple[str, list[str]]:
    tokens: list[str] = []

    def repl(m: re.Match[str]) -> str:
        tokens.append(m.group(0))
        return f"⟦{len(tokens) - 1}⟧"

    out = PLACEHOLDER_RE.sub(repl, s)
    out = TAG_RE.sub(repl, out)
    return out, tokens


def restore(s: str, tokens: list[str]) -> str:
    for i, tok in enumerate(tokens):
        s = s.replace(f"⟦{i}⟧", tok)
        s = s.replace(f"[[{i}]]", tok)
        s = s.replace(f"[{i}]", tok)
    return s


def translate_mymemory(text: str) -> str:
    q = urllib.parse.quote(text)
    url = f"https://api.mymemory.translated.net/get?q={q}&langpair=en-GB|fr-FR"
    req = urllib.request.Request(url, headers={"User-Agent": "muta-i18n/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    if data.get("responseStatus") != 200:
        raise RuntimeError(str(data)[:200])
    return data["responseData"]["translatedText"]


def should_keep(s: str) -> bool:
    t = s.strip()
    if not t:
        return True
    if t in KEEP_AS_IS:
        return True
    if PLACEHOLDER_RE.fullmatch(t):
        return True
    # mostly punctuation / numbers / brands
    if not re.search(r"[A-Za-z]{3,}", t):
        return True
    return False


def main() -> None:
    pairs = json.loads(FLAT_EN.read_text(encoding="utf-8"))
    cache: dict[str, str] = {}
    if CACHE.exists():
        cache = json.loads(CACHE.read_text(encoding="utf-8"))

    unique_vals = []
    seen = set()
    for item in pairs:
        v = item["v"]
        if v not in seen:
            seen.add(v)
            unique_vals.append(v)

    print(f"pairs={len(pairs)} unique={len(unique_vals)} cached={len(cache)}")

    done = 0
    errors = 0
    for v in unique_vals:
        if v in cache:
            continue
        if should_keep(v):
            cache[v] = v
            continue
        protected, tokens = protect(v)
        try:
            fr = translate_mymemory(protected)
            fr = restore(fr, tokens)
            # Fix common MT artifacts for ellipsis
            fr = fr.replace("...", "…").replace("..", "…")
            cache[v] = fr
            done += 1
            if done % 25 == 0:
                CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
                print(f"translated {done} new (cache={len(cache)})")
            time.sleep(0.35)
        except Exception as e:
            errors += 1
            print(f"ERR [{errors}] {v[:60]!r}: {e}")
            time.sleep(1.5)
            if errors > 40:
                print("too many errors, stopping")
                break

    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")

    out = []
    missing = 0
    for item in pairs:
        v = item["v"]
        fr = cache.get(v)
        if fr is None:
            missing += 1
            fr = v
        out.append({"k": item["k"], "v": fr})

    OUT_FLAT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT_FLAT} missing_in_cache={missing} cache_size={len(cache)}")


if __name__ == "__main__":
    main()
