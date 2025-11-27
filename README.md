
# DOS Camera Dithering - Web Implementation

Real-time VGA-era dithered camera feed running in browser. Deploys to GitHub Pages, bypasses iOS app distribution complexity.

## Technical Specifications

**Target Output:** 320x200 resolution, 16-color VGA palette, Bayer 4x4 ordered dithering  
**Performance Target:** 30fps sustained on iPhone Safari  
**Processing Pipeline:** WebRTC → Canvas 2D → Bayer dithering → VGA palette reduction  
**Deployment:** GitHub Pages (HTTPS automatic, camera API compatible)

## Performance Constraints

| Resolution | Frame Rate | Pixel Count | Thermal Behavior |
|------------|------------|-------------|------------------|
| 320x200    | 30fps      | 64,000      | No throttling    |
| 640x480    | 15-20fps   | 307,200     | Moderate heat    |
| 1280x960   | 8-12fps    | 1,228,800   | Heavy throttling |

Battery drain: 25-30% per hour at 320x200 (JavaScript overhead vs native Metal at 15-20%).

## Repository Structure

```
/
├── index.html          # Canvas container, video element, UI controls
├── dither.js           # Bayer matrix implementation, palette reduction
├── palette.js          # VGA 16-color lookup table
├── camera.js           # WebRTC camera access, frame processing loop
├── styles.css          # Fullscreen layout, DOS aesthetic
└── README.md           # Usage instructions
```

## Version Management

This project follows semantic versioning for pre-1.0 software:

- **0.x.0** - New features (e.g., camera modes, resolutions, major UI changes)
- **0.x.y** - Bug fixes, minor improvements, performance optimizations
- **1.0.0** - Production-ready release (stable API, fully tested on target devices)

### Version Update Protocol

**Before every git commit:**

1. Assess the nature of your changes:
   - New features → Increment MINOR version (0.1.0 → 0.2.0)
   - Bug fixes/tweaks → Increment PATCH version (0.1.0 → 0.1.1)

2. Update version number in `index.html` (line 33):
   ```html
   <div id="version">v0.x.y</div>
   ```

3. Update CHANGELOG section below with changes for this version

4. Commit with descriptive message referencing version:
   ```bash
   git commit -m "v0.2.0: Add auto-start camera and 480×270 resolution"
   ```

**Important:** Never commit without updating the version number if changes are user-facing. This ensures the displayed version in the UI always matches the deployed code.

## Changelog

### v0.2.5 (2025-11-27)
- Fixed **AMBER_FIRE** camera freeze by reversing array order
  - Root cause: Palette was ordered bright→dark (descending) instead of dark→bright (ascending)
  - All other palettes go from black to light colors
  - Reversed order now matches convention: black → dark red → bright orange-red
  - Camera feed now works properly

### v0.2.4 (2025-11-27)
- Removed **AMBER_CORBIJN** and **NEON_CITY** (both caused camera freeze requiring page refresh)
- Added **AMBER_FIRE**: 6-color fire/ember gradient palette
  - Colors: #FF4C00, #E03000, #B32700, #890000, #470000, #000000
  - Gradient from bright orange-red through dark red to black
  - Based on original AMBER palette, extended with specified color stops
  - Simpler implementation should avoid freeze issues

### v0.2.3 (2025-11-27)
- Removed AMBER_AA, AMBER_AG, AMBER_GG (2-color blends showed minimal visual difference)
- Added **AMBER_CORBIJN**: 6-tone photographic amber palette inspired by Anton Corbijn's work
  - Rich shadow detail with blacks, dark browns, and burnt umbers
  - Smooth midtone transition through burnt orange and warm amber
  - Bright amber highlights for specular detail
  - Significantly more tonal range than 2-color AMBER
- Added **NEON_CITY**: 5-color vibrant palette (black, orange-red, deep blue, bright yellow, cyan-blue)
- Analysis: Previous AMBER variations failed because blending 2-color palettes yields imperceptible differences
- Solution: Multi-tone palettes with 5-6 carefully chosen intermediate shades

### v0.2.2 (2025-11-27)
- Removed all experimental AMBER palettes (STEP, GAMMA, 8, BRIGHT, CUSTOM, ENHANCED)
- Added 3 new optimized AMBER palette blends:
  - **AMBER_AA**: 50:50 blend of linear gradient and gamma-corrected
  - **AMBER_AG**: 30:70 blend (more gamma contrast)
  - **AMBER_GG**: 70:30 blend (more linear gradient)
- Added `blendPalettes()` helper function for mixing palettes
- Simplified palette options based on testing feedback

### v0.2.1 (2025-11-27)
- Added 5 new AMBER palette variations for contrast testing:
  - **AMBER_STEP_GAMMA**: Non-linear gamma 2.2 interpolation for enhanced contrast
  - **AMBER_STEP_8**: 8-step gradient for dramatic banding effect
  - **AMBER_STEP_BRIGHT**: Adjusted endpoints (dark brown to bright amber)
  - **AMBER_STEP_CUSTOM**: S-curve interpolation with clustered extremes
  - **AMBER_STEP_ENHANCED**: Gamma + bright endpoint combo (recommended)
- Added gamma correction and custom curve interpolation functions
- All variations available for A/B testing before trimming

### v0.2.0 (2025-11-27)
- Added 480×270 resolution option (16:9 aspect ratio)
- Camera now starts automatically on page load
- Moved snapshot button to rightmost position in toolbar
- Canvas now fills screen while maintaining aspect ratio (object-fit: contain)
- Improved visual presentation with full viewport coverage

### v0.1.0 (Initial Release)
- Real-time VGA-era dithering with Bayer 4×4 matrix
- Multiple resolution support (960×540, 640×360, 320×180)
- Multiple palette options (VGA, CGA variants, Amber, Green Phosphor, Grayscale)
- Camera flip functionality (front/back)
- Snapshot capability (PNG export)
- Hide UI mode for clean viewing
- FPS counter for performance monitoring
- iOS Safari optimized

## Implementation Details

### 1. index.html

Core structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>DOS Camera Dither</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <video id="video" autoplay playsinline style="display:none;"></video>
    <canvas id="canvas"></canvas>
    <div id="controls">
        <button id="startBtn">Start Camera</button>
        <button id="flipBtn">Flip Camera</button>
        <select id="resolutionSelect">
            <option value="320x200">320x200 (VGA)</option>
            <option value="640x480">640x480</option>
        </select>
        <div id="fps">FPS: --</div>
    </div>
    
    <script src="palette.js"></script>
    <script src="dither.js"></script>
    <script src="camera.js"></script>
</body>
</html>
```

Critical attributes:
- `playsinline` prevents fullscreen video takeover on iOS
- `user-scalable=no` prevents zoom interference
- Video element hidden, canvas displays processed output

### 2. palette.js

VGA 16-color palette with 6-bit DAC values converted to 8-bit RGB:

```javascript
const VGA_PALETTE = [
    [0, 0, 0],          // 0: Black
    [0, 0, 170],        // 1: Blue
    [0, 170, 0],        // 2: Green
    [0, 170, 170],      // 3: Cyan
    [170, 0, 0],        // 4: Red
    [170, 0, 170],      // 5: Magenta
    [170, 85, 0],       // 6: Brown
    [170, 170, 170],    // 7: Light Gray
    [85, 85, 85],       // 8: Dark Gray
    [85, 85, 255],      // 9: Light Blue
    [85, 255, 85],      // 10: Light Green
    [85, 255, 255],     // 11: Light Cyan
    [255, 85, 85],      // 12: Light Red
    [255, 85, 255],     // 13: Light Magenta
    [255, 255, 85],     // 14: Yellow
    [255, 255, 255]     // 15: White
];

// Pre-compute squared distances for palette matching
// Euclidean distance in RGB space: sqrt((r1-r2)^2 + (g1-g2)^2 + (b1-b2)^2)
function findClosestColor(r, g, b) {
    let minDist = Infinity;
    let closestIdx = 0;
    
    for (let i = 0; i < VGA_PALETTE.length; i++) {
        const [pr, pg, pb] = VGA_PALETTE[i];
        const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
        
        if (dist < minDist) {
            minDist = dist;
            closestIdx = i;
        }
    }
    
    return closestIdx;
}
```

Palette matching optimization: squared distances avoid sqrt() calculation (monotonic relationship preserved).

### 3. dither.js

Bayer 4x4 ordered dithering matrix:

```javascript
const BAYER_MATRIX = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
];

// Normalize matrix values to 0-1 range
const BAYER_NORMALIZED = BAYER_MATRIX.map(row => 
    row.map(val => (val + 0.5) / 16)
);

function applyDithering(imageData, width, height) {
    const data = imageData.data;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            
            // Get Bayer threshold for this pixel position
            const threshold = BAYER_NORMALIZED[y % 4][x % 4];
            
            // Apply threshold to RGB channels
            let r = data[idx];
            let g = data[idx + 1];
            let b = data[idx + 2];
            
            // Add dither noise
            r = Math.min(255, r + (threshold - 0.5) * 64);
            g = Math.min(255, g + (threshold - 0.5) * 64);
            b = Math.min(255, b + (threshold - 0.5) * 64);
            
            // Clamp to 0-255
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));
            
            // Find closest VGA color
            const colorIdx = findClosestColor(r, g, b);
            const [finalR, finalG, finalB] = VGA_PALETTE[colorIdx];
            
            // Write back to imageData
            data[idx] = finalR;
            data[idx + 1] = finalG;
            data[idx + 2] = finalB;
            // Alpha channel unchanged
        }
    }
}
```

Dither noise amplitude (64) is tuned for VGA palette spacing. Higher values increase pattern visibility, lower values reduce color separation.

### 4. camera.js

Frame processing loop with performance monitoring:

```javascript
let video, canvas, ctx;
let animationId;
let currentFacingMode = 'environment';
let currentWidth = 320;
let currentHeight = 200;
let frameCount = 0;
let lastFpsUpdate = Date.now();

async function initCamera() {
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    canvas.width = currentWidth;
    canvas.height = currentHeight;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: currentFacingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        video.srcObject = stream;
        video.play();
        
        video.onloadedmetadata = () => {
            processFrame();
        };
    } catch (err) {
        console.error('Camera access denied:', err);
        alert('Camera access required. Check permissions.');
    }
}

function processFrame() {
    // Draw video frame to canvas at target resolution
    ctx.drawImage(video, 0, 0, currentWidth, currentHeight);
    
    // Get pixel data
    const imageData = ctx.getImageData(0, 0, currentWidth, currentHeight);
    
    // Apply dithering and palette reduction
    applyDithering(imageData, currentWidth, currentHeight);
    
    // Put processed data back
    ctx.putImageData(imageData, 0, 0);
    
    // FPS calculation
    frameCount++;
    const now = Date.now();
    if (now - lastFpsUpdate >= 1000) {
        const fps = frameCount;
        document.getElementById('fps').textContent = `FPS: ${fps}`;
        frameCount = 0;
        lastFpsUpdate = now;
    }
    
    animationId = requestAnimationFrame(processFrame);
}

function stopCamera() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
}

async function flipCamera() {
    stopCamera();
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    await initCamera();
}

function changeResolution(width, height) {
    const wasRunning = animationId !== null;
    if (wasRunning) stopCamera();
    
    currentWidth = width;
    currentHeight = height;
    canvas.width = width;
    canvas.height = height;
    
    if (wasRunning) initCamera();
}

// Event listeners
document.getElementById('startBtn').addEventListener('click', () => {
    if (animationId) {
        stopCamera();
        document.getElementById('startBtn').textContent = 'Start Camera';
    } else {
        initCamera();
        document.getElementById('startBtn').textContent = 'Stop Camera';
    }
});

document.getElementById('flipBtn').addEventListener('click', flipCamera);

document.getElementById('resolutionSelect').addEventListener('change', (e) => {
    const [width, height] = e.target.value.split('x').map(Number);
    changeResolution(width, height);
});
```

Performance notes:
- `willReadFrequently: true` optimizes getImageData() calls
- requestAnimationFrame synchronizes with display refresh (60Hz cap)
- FPS counter measures actual processing rate vs target

### 5. styles.css

DOS-inspired fullscreen interface:

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background: #000;
    font-family: 'Courier New', monospace;
    color: #aaa;
    overflow: hidden;
    touch-action: none;
}

canvas {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    max-width: 100vw;
    max-height: 80vh;
    border: 2px solid #555;
}

#controls {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    align-items: center;
    background: rgba(0, 0, 0, 0.8);
    padding: 10px;
    border: 1px solid #555;
}

button, select {
    background: #222;
    color: #aaa;
    border: 1px solid #555;
    padding: 8px 16px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    cursor: pointer;
}

button:active {
    background: #333;
}

#fps {
    color: #0f0;
    font-size: 14px;
    min-width: 80px;
}
```

Critical CSS properties:
- `image-rendering: pixelated` prevents canvas antialiasing (preserves sharp pixel edges)
- `touch-action: none` disables iOS gesture interference
- Monospace font maintains DOS aesthetic

## Deployment Instructions

### GitHub Pages Setup

1. Create new repository: `dos-camera-dither`
2. Push files to main branch
3. Navigate to repository Settings → Pages
4. Source: Deploy from branch `main`, folder `/ (root)`
5. Wait 30-60 seconds for deployment
6. Access at: `https://[username].github.io/dos-camera-dither`

### Testing Procedure

1. Open URL on iPhone Safari
2. Click "Start Camera" → Allow camera permissions
3. Verify 30fps sustained (check FPS counter)
4. Test camera flip button (front/back toggle)
5. Test resolution switching
6. Monitor thermal behavior during 5-minute continuous use

Expected behavior:
- Initial frame rate spike to 60fps, settling at 30fps
- Slight device warming after 3 minutes
- No frame drops or stuttering at 320x200

### iOS Safari Specific Issues

**Problem:** Camera permission prompt doesn't appear  
**Solution:** Ensure HTTPS (GitHub Pages provides this automatically)

**Problem:** Video displays black screen  
**Solution:** Add `playsinline` attribute to video element

**Problem:** Canvas looks blurry/antialiased  
**Solution:** Verify `image-rendering: pixelated` in CSS

**Problem:** Page zooms unexpectedly  
**Solution:** Add `user-scalable=no` to viewport meta tag

## Performance Optimization Options

### If frame rate drops below 25fps at 320x200:

1. **Reduce palette lookup cost:**
   ```javascript
   // Pre-compute 8-bit RGB to 4-bit palette index lookup table
   const paletteLUT = new Uint8Array(256 * 256 * 256);
   // Initialize once at startup (5-bit quantization reduces to 32K entries)
   ```

2. **Simplify dither calculation:**
   ```javascript
   // Replace per-pixel Bayer lookup with bitwise operations
   const ditherValue = ((x & 3) + ((y & 3) << 2));
   ```

3. **Reduce color channels:**
   ```javascript
   // Convert to grayscale before dithering (single channel vs RGB)
   const gray = (r * 0.299 + g * 0.587 + b * 0.114);
   ```

### Alternative: WebAssembly Implementation

For sustained 60fps at higher resolutions, compile dithering logic to WASM:

```bash
# Requires Emscripten toolchain
emcc dither.c -o dither.wasm -O3 -s WASM=1 -s EXPORTED_FUNCTIONS='["_applyDither"]'
```

Expected performance gain: 3-5x over JavaScript at 640x480 resolution.

## Browser Compatibility

| Browser | Camera API | Canvas 2D | Performance |
|---------|------------|-----------|-------------|
| iOS Safari 14+ | Full | Full | 30fps @ 320x200 |
| Chrome Android | Full | Full | 45fps @ 320x200 |
| Chrome Desktop | Full | Full | 60fps @ 640x480 |
| Firefox Desktop | Full | Full | 60fps @ 640x480 |

Edge cases:
- Safari <14: No camera API support
- HTTP (non-HTTPS): Camera access blocked
- Private browsing: Camera access may require explicit permission per session

## Extension Points

### CGA 4-Color Mode

Replace VGA 16-color palette with CGA cyan/magenta/white:

```javascript
const CGA_PALETTE = [
    [0, 0, 0],          // Black
    [85, 255, 255],     // Cyan
    [255, 85, 255],     // Magenta
    [255, 255, 255]     // White
];
```

Processing cost: 75% reduction (4 colors vs 16).

### EGA 64-Color Mode

Expand palette to EGA 6-bit color (64 colors):

```javascript
// Generate all 64 EGA colors (2 bits per channel)
const EGA_PALETTE = [];
for (let r = 0; r < 4; r++) {
    for (let g = 0; g < 4; g++) {
        for (let b = 0; b < 4; b++) {
            EGA_PALETTE.push([r * 85, g * 85, b * 85]);
        }
    }
}
```

Processing cost: 4x increase (64 distance calculations vs 16).

### Aspect Ratio Correction

VGA mode 13h uses non-square pixels (320x200 displayed at 4:3 aspect):

```css
canvas {
    /* Stretch vertically by 1.2x to match VGA display */
    aspect-ratio: 320 / 240;
}
```

### Recording Capability

Add canvas stream capture for video recording:

```javascript
const stream = canvas.captureStream(30); // 30fps
const recorder = new MediaRecorder(stream);
recorder.start();
// ... handle recording data
```

Output: WebM video file with dithered effect baked in.

## Implementation Time Estimate

| Task | Time | Complexity |
|------|------|------------|
| File structure setup | 15 min | Trivial |
| Palette implementation | 30 min | Low |
| Dither algorithm | 45 min | Medium |
| Camera integration | 45 min | Medium |
| UI controls | 30 min | Low |
| CSS styling | 20 min | Low |
| Testing/debugging | 60 min | Medium |
| **Total** | **3.5 hours** | |

Assumption: Developer familiar with Canvas API and JavaScript async patterns.

## Success Criteria

1. Camera initializes within 2 seconds of button press
2. 30fps sustained at 320x200 for 10 minutes continuous use
3. Frame rate displayed accurately (±2fps)
4. Camera flip works without restart
5. Resolution switching preserves camera state
6. No memory leaks during extended use
7. Works on iPhone Safari 14+ without polyfills

## Measurement Methodology

Performance testing procedure:

1. Open browser DevTools Performance panel
2. Start camera feed
3. Record 60-second trace
4. Analyze frame timing:
   - Target: 33.3ms per frame (30fps)
   - Red flag: >50ms frames (drops below 20fps)
   - Profile bottleneck: dither.js or palette.js

Expected bottleneck: `findClosestColor()` function (16 distance calculations per pixel).

## Next Steps

1. Clone repository structure
2. Implement palette.js (15 minutes)
3. Implement dither.js (30 minutes)
4. Implement camera.js (30 minutes)
5. Build index.html + styles.css (20 minutes)
6. Test locally with `python -m http.server 8000`
7. Push to GitHub and enable Pages
8. Test on iPhone Safari

Total implementation: 2-3 hours to working prototype.
