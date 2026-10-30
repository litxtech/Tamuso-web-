# -*- coding: utf-8 -*-
import json

p = r"src/i18n/locales/ar.json"
text = open(p, encoding="utf-8").read()
needle = '    "yorumEkle": "أضف تعليقًا...",\n'
extra = """    "kesit": "مقطع",
    "kesitPaylas": "مشاركة المقطع",
    "kesitSure": "مدة المقطع",
    "kesitSn": "{{n}} ث",
    "kesitHazirlaniyor": "جارٍ تجهيز المقطع...",
    "kesitKaydediliyor": "جارٍ معالجة الفيديو...",
    "kesitYukleniyor": "جارٍ الرفع... {{n}}%",
    "kesitYayinlaniyor": "جارٍ نشر القصة...",
    "kesitHazir": "المقطع جاهز 🎬",
    "kesitTekrar": "إنشاء مجددًا",
    "kesitStoryPaylas": "مشاركة في القصة",
    "kesitOlusturulamadi": "تعذر إنشاء المقطع.",
    "kesitVideoHazirlanamadi": "تعذر تجهيز الفيديو.",
    "kesitYuklemeBasarisiz": "فشل الرفع.",
    "kesitStoryYayinlanamadi": "تعذر نشر القصة.",
    "kesitKaynakYok": "لم يعد هذا البث متاحًا.",
    "kesitCokBuyuk": "ملف الفيديو كبير جدًا.",
    "kesitPaylasildi": "تمت مشاركة المقطع كقصة.",
    "kesitCaption": "وصف (اختياري)",
    "kesitCanliYayindan": "من البث",
    "kesitPk": "PK",
    "kesitYayinaKatil": "انضم إلى البث",
    "kesitCanli": "مباشر",
    "kesitYayinBitti": "انتهى البث",
    "kesitPkBitti": "انتهى التحدي",
    "kesitRozet": "LIVE CLIP",
    "kesitOzelYayin": "لا يمكن تحويل بث خاص إلى قصة عامة.",
    "kesitLimit": "تنشئ مقاطع بسرعة كبيرة. انتظر قليلًا.",
    "kesitOnizlemeSessiz": "المعاينة صامتة حتى لا يتأثر ميكروفون البث.",
"""
if needle not in text:
    raise SystemExit("needle missing")
if '"kesit":' in text:
    raise SystemExit("already")
text = text.replace(needle, needle + extra, 1)
json.loads(text)
open(p, "w", encoding="utf-8", newline="\n").write(text)
print("ar ok")
