// Helper function to interpolate colors
function interpolateColors(color1, color2, steps) {
    const palette = [];
    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const r = Math.round(color1[0] + (color2[0] - color1[0]) * t);
        const g = Math.round(color1[1] + (color2[1] - color1[1]) * t);
        const b = Math.round(color1[2] + (color2[2] - color1[2]) * t);
        palette.push([r, g, b]);
    }
    return palette;
}

const PALETTES = {
    VGA: [
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
    ],
    CGA_CYAN: [
        [0, 0, 0],          // Black
        [0, 255, 255],      // Cyan
        [255, 0, 255],      // Magenta
        [255, 255, 255]     // White
    ],
    CGA_RGBY: [
        [0, 0, 0],          // Black
        [255, 0, 0],        // Red
        [0, 255, 0],        // Green
        [255, 255, 0]       // Yellow
    ],
    AMBER: [
        [0, 0, 0],          // Black
        [255, 176, 0]       // Amber
    ],
    AMBER_STEP: interpolateColors([0, 0, 0], [255, 176, 0], 16),
    GREEN_PHOSPHOR: [
        [0, 0, 0],          // Black
        [0, 255, 0]         // Green
    ],
    GREEN_STEP: interpolateColors([0, 0, 0], [0, 255, 0], 16),
    GRAYSCALE: interpolateColors([0, 0, 0], [255, 255, 255], 16)
};

// Current palette (can be changed)
let currentPalette = PALETTES.VGA;

// Pre-compute squared distances for palette matching
// Euclidean distance in RGB space: sqrt((r1-r2)^2 + (g1-g2)^2 + (b1-b2)^2)
function findClosestColor(r, g, b) {
    let minDist = Infinity;
    let closestIdx = 0;

    for (let i = 0; i < currentPalette.length; i++) {
        const [pr, pg, pb] = currentPalette[i];
        const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;

        if (dist < minDist) {
            minDist = dist;
            closestIdx = i;
        }
    }

    return closestIdx;
}
