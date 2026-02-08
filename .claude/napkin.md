# Napkin

## Corrections
| Date | Source | What Went Wrong | What To Do Instead |
|------|--------|----------------|-------------------|
| 2026-02-07 | user | Shutter auto-downloaded via `link.click()` causing iOS save dialog | Save to gallery only; let user download from preview |
| 2026-02-07 | self | Reported feature done without browser testing | Always verify with browser automation before marking complete |

## User Preferences
- Gallery tap = preview, not direct download
- iOS-native feel: system share sheets, save to photos
- Combined button-dropdown pattern for actions with options

## Patterns That Work
- Web Share API: `navigator.share({ files: [file] })` for iOS share sheet — requires File object from blob
- Nearest-neighbor scaling: `ctx.imageSmoothingEnabled = false` before `drawImage`
- Button-dropdown combo: separate button + toggle, dropup positioned absolute from parent
- VGA hue-select: `rgbToHue` + `hueDistance` with radius+falloff gives smooth color spotlight. Achromatic check (hue<0) keeps grays untouched.
- Tap-to-pick: Sample from `video` element (not canvas) to get pre-dither color. 5×5 → 1×1 drawImage averages the region. `vgaBaseHue` + temp offset model for base+fine-tune.
- Landing page: `site/index.html`. anime.js v3 from CDN (v4 beta, unreliable on CDN). Horizontal gallery scroll via `position: sticky` + `transform: translateX`. Mouse ambient glow via CSS custom properties + `radial-gradient`.
- Playwright/Firefox click on canvas times out (canvas redraws = never "stable"). Use `execute_script` to dispatch mouse events instead.

## Patterns That Don't Work
- Hardcoded `?t=` cache busters — never change, iOS Safari caches forever
- `<meta http-equiv="Cache-Control">` — iOS Safari largely ignores these

## Domain Notes
- **Commit protocol**: Always update CHANGELOG.md + timestamp in index.html line 38 before pushing. Format: `Mon DD, HHMM`
- Palette order: dark to bright in `[r, g, b]` arrays
- Long edge resolution (960/640/480/320), short edge derived from viewport aspect
- localStorage gallery key: `dither_gallery`, max 50 items
- Current bottleneck: `findClosestColor()` — per-pixel per-frame
