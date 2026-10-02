from pathlib import Path
import json

EXTRA = {
    "tr": {
        "temaAltAciklama": "Foto yokken oda bu temayı arka plan olarak kullanır",
        "koltukAralikDolu": "{{min}}–{{max}} arası · dolu {{dolu}}",
        "hediyeGonderildi": "{{hediye}} gönderildi!",
        "takipci": "Takipçi",
        "profilSayfasinaGit": "Profil sayfasına git",
    },
    "en": {
        "temaAltAciklama": "Without a photo, the room uses this theme as background",
        "koltukAralikDolu": "{{min}}–{{max}} · {{dolu}} seated",
        "hediyeGonderildi": "{{hediye}} sent!",
        "takipci": "Followers",
        "profilSayfasinaGit": "Go to profile",
    },
    "es": {
        "temaAltAciklama": "Sin foto, la sala usa este tema de fondo",
        "koltukAralikDolu": "{{min}}–{{max}} · {{dolu}} sentados",
        "hediyeGonderildi": "¡{{hediye}} enviado!",
        "takipci": "Seguidores",
        "profilSayfasinaGit": "Ir al perfil",
    },
    "ar": {
        "temaAltAciklama": "بدون صورة تستخدم الغرفة هذه السمة كخلفية",
        "koltukAralikDolu": "{{min}}–{{max}} · {{dolu}} جالسون",
        "hediyeGonderildi": "أُرسلت {{hediye}}!",
        "takipci": "المتابعون",
        "profilSayfasinaGit": "الذهاب إلى الملف",
    },
}


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'")


for lang in ("tr", "en", "es"):
    p = Path(f"src/i18n/locales/{lang}.ts")
    t = p.read_text(encoding="utf-8")
    for k, v in EXTRA[lang].items():
        if f"{k}:" in t.split("sesOda:")[1].split("kisilerX:")[0]:
            continue
        line = f"    {k}: '{esc(v)}',\n"
        t = t.replace("    aksiyonSec:", line + "    aksiyonSec:", 1)
    p.write_text(t, encoding="utf-8")
    print(lang)

p = Path("scripts/ar_parts/sesOda.json")
d = json.loads(p.read_text(encoding="utf-8"))
d.update(EXTRA["ar"])
p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("ar_parts")
