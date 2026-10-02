#!/usr/bin/env python3
"""Translate unique EN leaf values to French via Bing (translators package)."""
from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

import translators as ts

ROOT = Path(__file__).resolve().parents[2]
FLAT_EN = ROOT / "scripts" / "fr_parts" / "_flat_en.json"
CACHE = ROOT / "scripts" / "fr_parts" / "_mt_cache_fr.json"
OUT_FLAT = ROOT / "scripts" / "fr_parts" / "_flat_fr.json"
PROGRESS = ROOT / "scripts" / "fr_parts" / "_mt_progress.txt"

PLACEHOLDER_RE = re.compile(r"\{\{[^}]+\}\}")
KEEP = {
    "OK", "WhatsApp", "Tamuso", "PK", "ZEUS", "NOX", "Zeus", "Nox", "Stripe",
    "LiveKit", "VIP", "PDF", "Excel", "CRM", "IBAN", "KYC", "iOS", "Android",
    "BPM", "QR", "Karaoke", "Spotify", "Apple", "Toprak", "CSAM", "PiP",
    "WebView", "HTTPS", "HTTP", "URL", "ID", "SMS", "PIN", "USD", "EUR",
    "App Store", "Play", "Mini", "Social", "Solo", "Cascade",
}

def protect(s: str) -> tuple[str, list[str]]:
    tokens: list[str] = []
    def repl(m: re.Match[str]) -> str:
        tokens.append(m.group(0))
        return f"XPH{len(tokens)-1}X"
    return PLACEHOLDER_RE.sub(repl, s), tokens

def restore(s: str, tokens: list[str]) -> str:
    for i, tok in enumerate(tokens):
        for cand in (f"XPH{i}X", f"xph{i}x", f"Xph{i}X", f"XPH{i}x"):
            s = s.replace(cand, tok)
    # Ensure placeholders survived even if MT mangled markers
    return s

def should_keep(s: str) -> bool:
    t = s.strip()
    if not t or t in KEEP:
        return True
    if PLACEHOLDER_RE.fullmatch(t):
        return True
    if not re.search(r"[A-Za-zÀ-ÿ]{3,}", t):
        return True
    return False

def translate_one(text: str) -> str:
    protected, tokens = protect(text)
    fr = ts.translate_text(
        protected,
        translator="bing",
        from_language="en",
        to_language="fr",
    )
    fr = restore(fr, tokens)
    # typographic polish
    fr = fr.replace("...", "…")
    # restore any missing placeholders from original
    orig_ph = PLACEHOLDER_RE.findall(text)
    fr_ph = PLACEHOLDER_RE.findall(fr)
    if len(orig_ph) != len(fr_ph) or set(orig_ph) != set(fr_ph):
        # fall back: keep EN if placeholders broken
        return text
    return fr

def main() -> None:
    pairs = json.loads(FLAT_EN.read_text(encoding="utf-8"))
    cache: dict[str, str] = {}
    if CACHE.exists():
        cache = json.loads(CACHE.read_text(encoding="utf-8"))

    unique = []
    seen = set()
    for item in pairs:
        v = item["v"]
        if v not in seen:
            seen.add(v)
            unique.append(v)

    todo = [v for v in unique if v not in cache and not should_keep(v)]
    for v in unique:
        if v not in cache and should_keep(v):
            cache[v] = v

    print(f"unique={len(unique)} cached={len(cache)} todo={len(todo)}", flush=True)
    errors = 0
    for i, v in enumerate(todo, 1):
        try:
            cache[v] = translate_one(v)
            if i % 20 == 0:
                CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
                msg = f"ok {i}/{len(todo)} cache={len(cache)}"
                print(msg, flush=True)
                PROGRESS.write_text(msg, encoding="utf-8")
            time.sleep(0.15)
        except Exception as e:
            errors += 1
            print(f"ERR {errors} {v[:50]!r}: {e}", flush=True)
            time.sleep(1.0)
            if errors >= 30:
                print("too many errors", flush=True)
                break

    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
    out = []
    miss = 0
    for item in pairs:
        fr = cache.get(item["v"])
        if fr is None:
            miss += 1
            fr = item["v"]
        out.append({"k": item["k"], "v": fr})
    OUT_FLAT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"DONE cache={len(cache)} miss={miss} out={OUT_FLAT}", flush=True)

if __name__ == "__main__":
    main()
