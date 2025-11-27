// Helper function to interpolate colors (linear)
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

// Helper function to interpolate colors with gamma correction (non-linear)
function interpolateColorsGamma(color1, color2, steps, gamma = 2.2) {
    const palette = [];
    for (let i = 0; i < steps; i++) {
        const t = Math.pow(i / (steps - 1), gamma);
        const r = Math.round(color1[0] + (color2[0] - color1[0]) * t);
        const g = Math.round(color1[1] + (color2[1] - color1[1]) * t);
        const b = Math.round(color1[2] + (color2[2] - color1[2]) * t);
        palette.push([r, g, b]);
    }
    return palette;
}

// Helper function for custom curve with clustered extremes
function interpolateColorsCustom(color1, color2, steps) {
    const palette = [];
    for (let i = 0; i < steps; i++) {
        // S-curve: cluster values at extremes, spread middle
        let t = i / (steps - 1);
        t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const r = Math.round(color1[0] + (color2[0] - color1[0]) * t);
        const g = Math.round(color1[1] + (color2[1] - color1[1]) * t);
        const b = Math.round(color1[2] + (color2[2] - color1[2]) * t);
        palette.push([r, g, b]);
    }
    return palette;
}

// Helper function to blend two palettes
function blendPalettes(palette1, palette2, ratio) {
    // ratio is weight of palette1 (0-1), palette2 gets (1-ratio)
    const steps = Math.max(palette1.length, palette2.length);
    const blended = [];

    for (let i = 0; i < steps; i++) {
        const idx1 = Math.min(i, palette1.length - 1);
        const idx2 = Math.min(i, palette2.length - 1);
        const color1 = palette1[idx1];
        const color2 = palette2[idx2];

        const r = Math.round(color1[0] * ratio + color2[0] * (1 - ratio));
        const g = Math.round(color1[1] * ratio + color2[1] * (1 - ratio));
        const b = Math.round(color1[2] * ratio + color2[2] * (1 - ratio));

        blended.push([r, g, b]);
    }

    return blended;
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
    // Anton Corbijn-inspired photographic amber palette
    AMBER_CORBIJN: [
        [0, 0, 0],          // Pure black (deep shadows)
        [40, 20, 0],        // Dark brown (shadow detail)
        [90, 45, 0],        // Burnt umber (midtone shadows)
        [160, 80, 0],       // Burnt orange (midtones)
        [220, 130, 0],      // Warm amber (highlights)
        [255, 180, 20]      // Bright amber (specular highlights)
    ],
    // Neon city palette - vibrant 5-color scheme
    NEON_CITY: [
        [1, 1, 1],          // Near-black
        [255, 76, 0],       // Bright orange-red
        [41, 51, 155],      // Deep blue
        [253, 231, 76],     // Bright yellow
        [116, 164, 188]     // Muted cyan-blue
    ],
    // Continue with other palettes
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
