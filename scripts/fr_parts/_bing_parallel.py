#!/usr/bin/env python3
"""Parallel Bing EN→FR. Each worker writes its own cache shard; finalize merges."""
from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

import translators as ts

ROOT = Path(__file__).resolve().parents[2]
PARTS = ROOT / "scripts" / "fr_parts"
FLAT_EN = PARTS / "_flat_en.json"
CACHE = PARTS / "_mt_cache_fr.json"
OUT_FLAT = PARTS / "_flat_fr.json"

PLACEHOLDER_RE = re.compile(r"\{\{[^}]+\}\}")
KEEP = {
    "OK", "WhatsApp", "Tamuso", "PK", "ZEUS", "NOX", "Zeus", "Nox", "Stripe",
    "LiveKit", "VIP", "PDF", "Excel", "CRM", "IBAN", "KYC", "iOS", "Android",
    "BPM", "QR", "Karaoke", "Spotify", "Apple", "Toprak", "CSAM", "PiP",
    "WebView", "HTTPS", "HTTP", "URL", "ID", "SMS", "PIN", "USD", "EUR",
    "App Store", "Play", "Mini", "Social", "Solo", "Cascade", "guest", "Combo",
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
    if len(text.strip()) < 2:
        return text
    protected, tokens = protect(text)
    try:
        fr = ts.translate_text(
            protected, translator="bing", from_language="en", to_language="fr"
        )
    except Exception:
        # fallback google
        fr = ts.translate_text(
            protected, translator="google", from_language="en", to_language="fr"
        )
    if not isinstance(fr, str) or not fr.strip():
        return text
    fr = restore(fr, tokens).replace("...", "…")
    orig_ph = PLACEHOLDER_RE.findall(text)
    fr_ph = PLACEHOLDER_RE.findall(fr)
    if len(orig_ph) != len(fr_ph) or set(orig_ph) != set(fr_ph):
        return text
    return fr

def shard_path(wid: int) -> Path:
    return PARTS / f"_mt_shard_{wid}.json"

def worker(wid: int, nworkers: int) -> None:
    pairs = json.loads(FLAT_EN.read_text(encoding="utf-8"))
    unique = []
    seen = set()
    for item in pairs:
        v = item["v"]
        if v not in seen:
            seen.add(v)
            unique.append(v)

    # Prefer existing global cache + shard
    base = {}
    if CACHE.exists():
        base = json.loads(CACHE.read_text(encoding="utf-8"))
    shard = {}
    sp = shard_path(wid)
    if sp.exists():
        shard = json.loads(sp.read_text(encoding="utf-8"))

    mine = [v for i, v in enumerate(unique) if i % nworkers == wid]
    print(f"W{wid} claimed={len(mine)}", flush=True)

    done = 0
    errors = 0
    for v in mine:
        if v in base or v in shard:
            continue
        if should_keep(v):
            shard[v] = v
            continue
        try:
            shard[v] = translate_one(v)
            done += 1
            if done % 15 == 0:
                sp.write_text(json.dumps(shard, ensure_ascii=False, indent=2), encoding="utf-8")
                print(f"W{wid} done={done} shard={len(shard)}", flush=True)
            time.sleep(0.08)
        except Exception as e:
            errors += 1
            print(f"W{wid} ERR {errors} {v[:40]!r}: {e}", flush=True)
            time.sleep(1.0)
            if errors >= 50:
                break

    sp.write_text(json.dumps(shard, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"W{wid} FINISHED done={done} errors={errors} shard={len(shard)}", flush=True)

def finalize() -> None:
    pairs = json.loads(FLAT_EN.read_text(encoding="utf-8"))
    cache = {}
    if CACHE.exists():
        cache.update(json.loads(CACHE.read_text(encoding="utf-8")))
    for sp in PARTS.glob("_mt_shard_*.json"):
        cache.update(json.loads(sp.read_text(encoding="utf-8")))
    # keep-as-is fills
    unique_vals = {item["v"] for item in pairs}
    for v in unique_vals:
        if v not in cache and should_keep(v):
            cache[v] = v
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
    print(f"FINALIZE cache={len(cache)} miss={miss} unique={len(unique_vals)}", flush=True)

if __name__ == "__main__":
    if sys.argv[1] == "finalize":
        finalize()
    else:
        worker(int(sys.argv[1]), int(sys.argv[2]))
