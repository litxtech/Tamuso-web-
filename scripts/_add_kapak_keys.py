# Add remaining kapak panel keys + patch component files
from pathlib import Path
import json
import re

EXTRA = {
  "tr": {
    "odaKartiBaslik": "Oda kartı & arka plan",
    "odaKartiAlt": "Modern tema seç veya kendi fotoğrafını yükle — odada tam ekran görünür",
    "onizleme": "Önizleme",
    "canliRozet": "CANLI",
    "ozelFotoKaldirTema": "Özel fotoğrafı kaldır · temaya dön",
    "modernTemalar": "Modern temalar",
  },
  "en": {
    "odaKartiBaslik": "Room card & background",
    "odaKartiAlt": "Pick a modern theme or upload your photo — full screen in the room",
    "onizleme": "Preview",
    "canliRozet": "LIVE",
    "ozelFotoKaldirTema": "Remove custom photo · back to theme",
    "modernTemalar": "Modern themes",
  },
  "es": {
    "odaKartiBaslik": "Tarjeta y fondo",
    "odaKartiAlt": "Elige un tema moderno o sube tu foto — a pantalla completa en la sala",
    "onizleme": "Vista previa",
    "canliRozet": "EN VIVO",
    "ozelFotoKaldirTema": "Quitar foto · volver al tema",
    "modernTemalar": "Temas modernos",
  },
  "ar": {
    "odaKartiBaslik": "بطاقة الغرفة والخلفية",
    "odaKartiAlt": "اختر سمة حديثة أو ارفع صورتك — تظهر بملء الشاشة في الغرفة",
    "onizleme": "معاينة",
    "canliRozet": "مباشر",
    "ozelFotoKaldirTema": "إزالة الصورة المخصصة · العودة للسمة",
    "modernTemalar": "سمات حديثة",
  },
}

def esc(s):
    return s.replace("\\", "\\\\").replace("'", "\\'")

for lang in ("tr", "en", "es"):
    p = Path(f"src/i18n/locales/{lang}.ts")
    t = p.read_text(encoding="utf-8")
    for k, v in EXTRA[lang].items():
        if f"{k}:" in t and "sesOda" in t[t.find("sesOda:"):t.find("sesOda:")+5000]:
            # check if already in sesOda block roughly
            pass
        if re.search(rf"\b{k}:\s*'", t):
            continue
        # insert before closing of sesOda — find bagliOnEk or hazir
        anchor = "    bagliOnEk:"
        if anchor not in t:
            anchor = "    hazir:"
        line = f"    {k}: '{esc(v)}',\n"
        t = t.replace(anchor, line + anchor, 1)
    p.write_text(t, encoding="utf-8")
    print("locale", lang)

# ar_parts
p = Path("scripts/ar_parts/sesOda.json")
d = json.loads(p.read_text(encoding="utf-8"))
d.update(EXTRA["ar"])
p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("ar_parts")
