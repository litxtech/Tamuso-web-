"""Fırtına Kralı ham görsellerini şeffaf WebP varlıklarına çevirir."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps

SRC = Path(r"C:\Users\ilkse\.cursor\projects\c-Users-ilkse-muta\assets")
OUT = Path(r"C:\Users\ilkse\muta\assets\games\storm-king")


def key_dark(image: Image.Image) -> Image.Image:
    """Köşeden taşan düz arka planı siler; taşın içindeki koyu fasetler kalır."""
    import numpy as np

    rgba = np.array(image.convert("RGBA"))
    rgb = rgba[:, :, :3].astype(np.int16)
    corners = np.concatenate(
        [
            rgb[:16, :16].reshape(-1, 3),
            rgb[:16, -16:].reshape(-1, 3),
            rgb[-16:, :16].reshape(-1, 3),
            rgb[-16:, -16:].reshape(-1, 3),
        ]
    )
    corner = np.median(corners, axis=0)
    dist = np.sqrt(np.square(rgb - corner).sum(axis=2))
    mask = dist < 36
    seeds = np.zeros(mask.shape, dtype=bool)
    seeds[0, :] = True
    seeds[-1, :] = True
    seeds[:, 0] = True
    seeds[:, -1] = True
    filled = seeds & mask
    while True:
        nxt = filled.copy()
        nxt[1:, :] |= filled[:-1, :]
        nxt[:-1, :] |= filled[1:, :]
        nxt[:, 1:] |= filled[:, :-1]
        nxt[:, :-1] |= filled[:, 1:]
        nxt &= mask
        if np.array_equal(nxt, filled):
            break
        filled = nxt
    rgba[:, :, 3] = np.where(filled, 0, rgba[:, :, 3])
    return Image.fromarray(rgba, "RGBA")


def save(image: Image.Image, relative: str, size: int | None, keyed: bool) -> None:
    prepared = image.convert("RGBA")
    if keyed:
        prepared = key_dark(prepared)
    if size is not None:
        prepared.thumbnail((size, size), Image.Resampling.LANCZOS)
    target = OUT / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    prepared.save(target, "WEBP", quality=82, method=6)
    print(f"{relative} {prepared.size} {target.stat().st_size}")


def open_src(name: str) -> Image.Image:
    path = SRC / name
    if not path.exists():
        raise SystemExit(f"missing {path}")
    return Image.open(path)


def main() -> None:
    save(open_src("temple-background.jpg"), "background/temple-background.webp", 1080, False)

    curtain = open_src("left-curtain.jpg")
    save(curtain, "background/left-curtain.webp", 720, True)
    save(ImageOps.mirror(curtain), "background/right-curtain.webp", 720, True)

    pillar = open_src("left-pillar.jpg")
    save(pillar, "background/left-pillar.webp", 720, True)
    save(ImageOps.mirror(pillar), "background/right-pillar.webp", 720, True)

    background = open_src("temple-background.jpg")
    crop = background.crop((0, int(background.height * 0.72), background.width, background.height))
    save(crop, "background/foreground.webp", 1080, False)

    save(open_src("slot-frame.jpg"), "frames/slot-frame.webp", 1400, True)
    save(open_src("top-ornament.jpg"), "frames/top-ornament.webp", 1400, True)
    save(open_src("bottom-console.jpg"), "frames/bottom-console.webp", 1400, True)
    save(open_src("multiplier-frame.jpg"), "frames/multiplier-frame.webp", 1200, True)

    for gem in ("ruby", "sapphire", "emerald", "amethyst", "topaz", "aqua"):
        save(open_src(f"{gem}.jpg"), f"symbols/{gem}.webp", 384, True)
    for orb in ("orb-purple", "orb-pink", "orb-gold"):
        save(open_src(f"{orb}.jpg"), f"multipliers/{orb}.webp", 384, True)
    for button in ("spin-normal", "spin-pressed", "control-button"):
        save(open_src(f"{button}.jpg"), f"buttons/{button}.webp", 512, True)
    for effect in ("lightning", "sparkle", "explosion", "glow"):
        save(open_src(f"{effect}.jpg"), f"effects/{effect}.webp", 512, True)


if __name__ == "__main__":
    main()
