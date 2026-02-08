# di_ther changelog

> **Commit protocol**: Always update this changelog and the timestamp in `index.html` (line 38) before pushing. Format: `Mon DD, HHMM`

## Feb 08, 1400
- VGA hue-select: horizontal swipe sweeps a color spotlight across the spectrum, desaturating out-of-range colors
- Tap-to-pick: tap viewfinder to sample scene color as hue center, then fine-tune ±90° with swipe
- Visual feedback: colored ring at tap point with fade-out animation
- Switching away from VGA resets picked hue

## Feb 07, 1915
- Gallery preview: tap opens full-screen view instead of downloading
- Share button: invokes iOS system share sheet (Web Share API)
- Save button-dropdown: tap saves, dropdown offers 1×/2×/4× nearest-neighbor scaling
- X button to close preview
- Fix: shutter no longer auto-downloads (was causing iOS save dialog + button disappearing)

## Feb 07, 1854
- Added README.md with LLM-friendly documentation, architecture overview, and roadmap

## Feb 03, 1833
- Resolution selector shows full calculated dimensions (e.g., 640×360), updates dynamically on viewport change
- Drop-up item text aligned with button text edge

## Feb 03, 2026
- Gallery: localStorage-based snapshot storage, upper-right button, tap to download, long-press to delete
- Aspect ratio: dynamic calculation from viewport, no more 16:9 lock - works on any screen ratio
- Resolution selector now shows long edge only (960/640/480/320), short edge derived from screen

## Jan 30, 2026 (earlier)
- Drop-up menus for resolution and palette selection
- Drop-up styling: no background, white text with shadow, edge-aligned
- Another World palette added
- Default resolution 640
- Removed 2× zoom button
- Replaced version marker with "last updated" timestamp

## Jan 30, 2026 (initial)
- Replaced original repo with Kimi build
- Gesture controls: vertical swipe for EV, horizontal for temperature
- Blade Runner palettes (classic + neon), Cyberpunk, Noir
- Cleaner skeletal UI with Geist Mono
- Title changed to "di_ther"
