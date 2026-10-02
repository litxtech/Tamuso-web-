from pathlib import Path

adds = {
    "tr": "    bagliOnEk: 'Bağlı',\n",
    "en": "    bagliOnEk: 'Connected',\n",
    "es": "    bagliOnEk: 'Conectado',\n",
}
for lang, line in adds.items():
    p = Path(f"src/i18n/locales/{lang}.ts")
    t = p.read_text(encoding="utf-8")
    if "bagliOnEk" in t:
        print("skip", lang)
        continue
    needle = "    hazir: "
    if needle not in t:
        # try after demoKonusmaci
        needle = "    demoKonusmaci:"
        # insert before hazir if present elsewhere
        idx = t.find("    hazir:")
        if idx < 0:
            raise SystemExit(f"hazir not in {lang}")
        t = t[:idx] + line + t[idx:]
    else:
        t = t.replace(needle, line + needle, 1)
    p.write_text(t, encoding="utf-8")
    print("ok", lang)

# ar_parts
import json
p = Path("scripts/ar_parts/sesOda.json")
d = json.loads(p.read_text(encoding="utf-8"))
d["bagliOnEk"] = "متصل"
p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("ar_parts ok")
