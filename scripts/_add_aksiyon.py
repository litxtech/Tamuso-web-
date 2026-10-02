from pathlib import Path
import json

vals = {
    "tr": "    aksiyonSec: 'Aksiyon seç',\n",
    "en": "    aksiyonSec: 'Choose action',\n",
    "es": "    aksiyonSec: 'Elige una acción',\n",
}
for lang, line in vals.items():
    p = Path(f"src/i18n/locales/{lang}.ts")
    t = p.read_text(encoding="utf-8")
    if "aksiyonSec:" in t:
        print("skip", lang)
        continue
    t = t.replace("    bagliOnEk:", line + "    bagliOnEk:", 1)
    p.write_text(t, encoding="utf-8")
    print("ok", lang)

p = Path("scripts/ar_parts/sesOda.json")
d = json.loads(p.read_text(encoding="utf-8"))
d["aksiyonSec"] = "اختر إجراءً"
p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("ar_parts ok")
