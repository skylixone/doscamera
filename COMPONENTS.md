# Component Registry

## Core Algorithms
- **Bayer dithering** → `/dither.js`
  - Purpose: Apply 4x4 ordered dithering to image data
  - Parameters: imageData, width, height
  - Performance: 60fps at 320x200
  - Created: 2024-11-26

- **Palette matching** → `/palette.js`
  - Purpose: Find closest color in palette using Euclidean distance
  - Parameters: r, g, b values
  - Performance: Bottleneck at high resolutions (16 distance calculations per pixel)
  - Created: 2024-11-26

## Camera Integration
- **Camera feed processing** → `/camera.js`
  - Purpose: WebRTC camera → Canvas 2D → dithering → display loop
  - Key functions: initCamera(), processFrame(), flipCamera()
  - Performance: requestAnimationFrame-based, FPS counter included
  - Created: 2024-11-26

## Palettes
- **VGA_PALETTE** → `/palette.js` (16 colors, authentic DOS)
- **CGA_CYAN** → `/palette.js` (4 colors, faster performance)
- **CGA_RGBY** → `/palette.js` (4 colors)
- **AMBER** → `/palette.js` (2 colors, 1-bit)
- **AMBER_STEP** → `/palette.js` (16 colors, 4-bit)
- **GREEN_PHOSPHOR** → `/palette.js` (2 colors, 1-bit)
- **GREEN_STEP** → `/palette.js` (16 colors, 4-bit)
- **GRAYSCALE** → `/palette.js` (16 shades)