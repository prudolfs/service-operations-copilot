#!/usr/bin/env bash
# Render a slide-deck PDF into the animated GIF used as the README header.
#
# Usage:
#   scripts/build-readme-header.sh [input.pdf] [output.gif]
#
# Env knobs:
#   WIDTH=1200          Output GIF width in pixels (height auto, kept even).
#   SECS_PER_SLIDE=2.5  How long each slide is shown.
#   DPI=200             Source render DPI before scaling.
#
# Requires: pdftoppm (poppler) and ffmpeg on PATH.

set -euo pipefail

pdf="${1:-slides.pdf}"
out="${2:-docs/readme-header.gif}"
width="${WIDTH:-1200}"
secs_per_slide="${SECS_PER_SLIDE:-2.5}"
dpi="${DPI:-200}"

if [ ! -f "$pdf" ]; then
  echo "build-readme-header: PDF not found: $pdf" >&2
  exit 1
fi
for bin in pdftoppm ffmpeg awk; do
  command -v "$bin" >/dev/null || { echo "build-readme-header: missing dependency: $bin" >&2; exit 1; }
done

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

pdftoppm -png -r "$dpi" "$pdf" "$tmp/page"

# Frames-per-second from seconds-per-slide.
fr=$(awk -v s="$secs_per_slide" 'BEGIN { printf "%.6f", 1/s }')

mkdir -p "$(dirname "$out")"

# Two-pass palette generation produces visibly cleaner GIFs than ffmpeg's default 256-color quantizer.
ffmpeg -hide_banner -loglevel error -y \
  -framerate "$fr" -i "$tmp/page-%d.png" \
  -vf "scale=${width}:-2:flags=lanczos,palettegen=stats_mode=full" \
  "$tmp/palette.png"

ffmpeg -hide_banner -loglevel error -y \
  -framerate "$fr" -i "$tmp/page-%d.png" -i "$tmp/palette.png" \
  -filter_complex "[0:v]scale=${width}:-2:flags=lanczos[x];[x][1:v]paletteuse=dither=sierra2_4a" \
  -loop 0 "$out"

echo "build-readme-header: wrote $out"
