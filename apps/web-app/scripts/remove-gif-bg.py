#!/usr/bin/env python3
"""
Remove the background from every animated GIF in a folder.

Run it INSIDE the folder that holds the .gif files (e.g. the folder produced by
download-exercise-gifs.mjs). Each GIF is processed frame by frame and
re-assembled into a transparent animated GIF written to ./nobg/. Originals are
left untouched. Re-running skips files already done (resumable).

    cd my-gifs
    python3 /path/to/remove-gif-bg.py

Two methods:
  * floodfill (default) — PURE PILLOW, no heavy deps. Flood-fills the background
    inward from the four corners with a colour tolerance. Great for the exercise
    GIFs (a single figure on a near-uniform light background). Works on any
    python3 (incl. 3.14) — only needs Pillow.
  * rembg — AI cut-out (U2Net), cleaner edges / handles busy backgrounds, but
    needs `pip install rembg onnxruntime` (no wheels for Python 3.14 yet — use
    3.11/3.12/3.13).

Options:
    python3 remove-gif-bg.py [inputDir]
        --method floodfill|rembg     (default: floodfill)
        --out DIR                    output folder            (default: ./nobg)
        --format gif|webp            (default: gif; webp keeps smooth alpha)
        --tolerance N                floodfill colour tolerance 0-255 (default 32)
        --model NAME                 rembg model (default u2netp; u2net = better)
        --overwrite                  redo files even if the output exists

Dependencies:
    floodfill:  pip install pillow
    rembg:      pip install rembg pillow onnxruntime   (Python <= 3.13)
"""

import argparse
import glob
import os
import sys
import time

try:
    from PIL import Image, ImageSequence, ImageDraw, ImageFilter
except ImportError:
    sys.exit("Pillow is required.  pip install pillow")


# --------------------------------------------------------------------------- #
# Background-removal methods (frame RGBA -> frame RGBA with alpha)
# --------------------------------------------------------------------------- #

_SENTINEL = (0, 255, 1)  # a colour the source is very unlikely to contain


def cut_floodfill(frame_rgba, tolerance):
    """Pure-Pillow: flood-fill the connected background from the 4 corners."""
    rgb = frame_rgba.convert("RGB")
    w, h = rgb.size
    marker = rgb.copy()
    for corner in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        ImageDraw.floodfill(marker, corner, _SENTINEL, thresh=tolerance)

    # Pixels the flood turned into the sentinel are background → alpha 0.
    src = list(frame_rgba.getdata())
    mark = list(marker.getdata())
    out_data = [
        (p[0], p[1], p[2], 0) if m == _SENTINEL else (p[0], p[1], p[2], 255)
        for p, m in zip(src, mark)
    ]
    out = Image.new("RGBA", frame_rgba.size)
    out.putdata(out_data)
    # soften the 1-px stair-stepping a touch
    out.putalpha(out.getchannel("A").filter(ImageFilter.SMOOTH))
    return out


def make_rembg_cutter(model_name):
    try:
        from rembg import remove, new_session
    except ImportError:
        sys.exit(
            "The 'rembg' method needs rembg + onnxruntime:\n"
            "  pip install rembg pillow onnxruntime\n"
            "(no wheels for Python 3.14 yet — use python3.11/3.12/3.13, "
            "or run the default --method floodfill which only needs Pillow)"
        )
    session = new_session(model_name)

    def cut(frame_rgba):
        res = remove(frame_rgba, session=session)
        return res if res.mode == "RGBA" else res.convert("RGBA")

    return cut


# --------------------------------------------------------------------------- #
# GIF assembly
# --------------------------------------------------------------------------- #

def rgba_to_transparent_p(im):
    """RGBA frame -> palette 'P' image with index 255 reserved for transparency."""
    alpha = im.getchannel("A")
    transparent_mask = alpha.point(lambda a: 255 if a < 128 else 0)
    p = im.convert("RGB").convert("P", palette=Image.ADAPTIVE, colors=255)
    p.paste(255, transparent_mask)
    p.info["transparency"] = 255
    return p


def process_gif(path, out_path, fmt, cut):
    src = Image.open(path)
    durations, cut_frames = [], []
    for frame in ImageSequence.Iterator(src):
        durations.append(frame.info.get("duration", 100))
        cut_frames.append(cut(frame.convert("RGBA")))
    if not cut_frames:
        return False

    loop = src.info.get("loop", 0)
    if fmt == "webp":
        cut_frames[0].save(
            out_path, format="WEBP", save_all=True, append_images=cut_frames[1:],
            duration=durations, loop=loop, lossless=True,
        )
    else:
        p_frames = [rgba_to_transparent_p(f) for f in cut_frames]
        p_frames[0].save(
            out_path, format="GIF", save_all=True, append_images=p_frames[1:],
            duration=durations, loop=loop, transparency=255, disposal=2,
            optimize=False,
        )
    return True


# --------------------------------------------------------------------------- #

def main():
    ap = argparse.ArgumentParser(description="Remove background from GIFs in a folder.")
    ap.add_argument("inputDir", nargs="?", default=".", help="folder with .gif files")
    ap.add_argument("--method", choices=["floodfill", "rembg"], default="floodfill")
    ap.add_argument("--out", default=None, help="output folder (default: <inputDir>/nobg)")
    ap.add_argument("--format", choices=["gif", "webp"], default="gif")
    ap.add_argument("--tolerance", type=int, default=32, help="floodfill colour tolerance 0-255")
    ap.add_argument("--model", default="u2netp")
    ap.add_argument("--overwrite", action="store_true")
    args = ap.parse_args()

    in_dir = args.inputDir
    out_dir = args.out or os.path.join(in_dir, "nobg")
    os.makedirs(out_dir, exist_ok=True)

    gifs = sorted(glob.glob(os.path.join(in_dir, "*.gif")))
    if not gifs:
        sys.exit(f"No .gif files found in {os.path.abspath(in_dir)}")

    if args.method == "rembg":
        print(f"Loading rembg model '{args.model}' … (first run downloads it)")
        cut = make_rembg_cutter(args.model)
    else:
        cut = lambda f: cut_floodfill(f, args.tolerance)  # noqa: E731

    ext = ".webp" if args.format == "webp" else ".gif"
    total = len(gifs)
    ok = skipped = failed = 0
    print(f"Method: {args.method} · processing {total} GIFs → {out_dir}")
    t0 = time.time()

    for i, path in enumerate(gifs, 1):
        out_path = os.path.join(out_dir, os.path.splitext(os.path.basename(path))[0] + ext)
        if os.path.exists(out_path) and not args.overwrite:
            skipped += 1
        else:
            try:
                ok += 1 if process_gif(path, out_path, args.format, cut) else 0
                if not os.path.exists(out_path):
                    failed += 1
            except Exception as e:  # noqa: BLE001 — keep going on a bad file
                failed += 1
                print(f"\n  ! {os.path.basename(path)}: {e}")
        rate = i / max(1e-6, time.time() - t0)
        print(
            f"\r[{i}/{total}] ok={ok} skipped={skipped} failed={failed} "
            f"({rate:.1f}/s, ETA {(total - i) / max(1e-6, rate) / 60:.1f}m)",
            end="", flush=True,
        )

    print(f"\nDone. ok={ok} skipped={skipped} failed={failed} → {os.path.abspath(out_dir)}")


if __name__ == "__main__":
    main()
