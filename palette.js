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

// Apply temperature shift to a palette
// temp: -1 (cool/blue) to +1 (warm/red), 0 = neutral
function applyTemperature(palette, temp) {
    if (temp === 0) return palette;
    
    return palette.map(color => {
        const [r, g, b] = color;
        if (temp > 0) {
            // Warm: boost red, reduce blue
            const factor = temp * 0.3; // Max 30% shift
            return [
                Math.min(255, Math.round(r * (1 + factor))),
                Math.round(g),
                Math.max(0, Math.round(b * (1 - factor)))
            ];
        } else {
            // Cool: boost blue, reduce red
            const factor = Math.abs(temp) * 0.3;
            return [
                Math.max(0, Math.round(r * (1 - factor))),
                Math.round(g),
                Math.min(255, Math.round(b * (1 + factor)))
            ];
        }
    });
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
    // Extended amber palette with fire/ember gradient
    AMBER_FIRE: [
        [0, 0, 0],          // Black
        [71, 0, 0],         // Very dark red
        [137, 0, 0],        // Dark red
        [179, 39, 0],       // Deep orange-red
        [224, 48, 0],       // Vivid orange-red
        [255, 76, 0]        // Bright orange-red
    ],
    GREEN_PHOSPHOR: [
        [0, 0, 0],          // Black
        [0, 255, 0]         // Green
    ],
    GREEN_STEP: interpolateColors([0, 0, 0], [0, 255, 0], 16),
    GRAYSCALE: interpolateColors([0, 0, 0], [255, 255, 255], 16),
    
    // ===== BLADE RUNNER INSPIRED PALETTES =====
    
    // Classic Blade Runner (1982) - Steel cyan/blue noir with neon accents
    // Based on Jordan Cronenweth's cinematography
    BLADE_RUNNER: [
        [5, 10, 20],        // Deep shadow blue-black
        [15, 35, 55],       // Dark steel blue
        [35, 65, 85],       // Midtone cyan-blue
        [60, 95, 115],      // Steel cyan
        [85, 125, 145],     // Light steel
        [120, 85, 110],     // Muted magenta (neon reflection)
        [180, 140, 60],     // Warm amber highlight (rare warm source)
        [200, 180, 160]     // Desaturated warm white
    ],
    
    // Blade Runner Neon - High contrast cyberpunk with vibrant neons
    BLADE_RUNNER_NEON: [
        [8, 5, 15],         // Deep purple-black
        [25, 20, 45],       // Dark purple
        [180, 40, 120],     // Hot magenta neon
        [255, 60, 160],     // Bright pink neon
        [40, 180, 200],     // Electric cyan
        [80, 220, 240],     // Bright cyan
        [240, 180, 40],     // Neon amber
        [255, 220, 100]     // Bright yellow
    ],
    
    // Cyberpunk - Classic cyberpunk palette with high contrast
    CYBERPUNK: [
        [10, 0, 20],        // Deep violet-black
        [40, 0, 60],        // Dark purple
        [100, 0, 120],      // Deep magenta
        [255, 0, 80],       // Hot pink
        [0, 240, 255],      // Electric cyan
        [120, 255, 180],    // Mint green
        [255, 255, 0],      // Cyber yellow
        [255, 255, 255]     // White
    ],
    
    // Noir - High contrast black and white with subtle blue tint
    NOIR: [
        [5, 5, 8],          // Near black with blue tint
        [25, 25, 30],       // Dark gray
        [60, 60, 68],       // Mid gray
        [100, 100, 108],    // Light gray
        [140, 140, 148],    // Lighter gray
        [180, 180, 188],    // Near white
        [220, 220, 228],    // White
        [240, 240, 248]     // Pure white
    ],
    
    // ===== ANOTHER WORLD (Out of This World) INSPIRED =====
    // Based on Éric Chahi's rotoscoped cinematography
    // Deep shadows, alien atmosphere, warm accent highlights
    ANOTHER_WORLD: [
        [0, 0, 0],          // Pure black (deep shadow)
        [20, 15, 35],       // Dark violet-black (cave shadow)
        [40, 30, 60],       // Deep purple (alien atmosphere)
        [60, 50, 90],       // Muted purple
        [85, 75, 120],      // Dusty violet
        [120, 100, 80],     // Warm brown (rock/skin)
        [180, 140, 100],    // Tan/flesh highlight
        [220, 180, 140]     // Warm cream (bright accent)
    ]
};

// Current palette (can be changed)
let currentPalette = PALETTES.VGA;
let currentPaletteName = 'VGA';
let currentTemperature = 0; // -1 to +1

// Pre-compute squared distances for palette matching
// Euclidean distance in RGB space: sqrt((r1-r2)^2 + (g1-g2)^2 + (b1-b2)^2)
function findClosestColor(r, g, b) {
    // Debug: Check if currentPalette is valid
    if (!currentPalette || !Array.isArray(currentPalette) || currentPalette.length === 0) {
        console.error('Invalid currentPalette:', currentPalette);
        return 0;
    }

    let minDist = Infinity;
    let closestIdx = 0;

    for (let i = 0; i < currentPalette.length; i++) {
        const color = currentPalette[i];

        // Debug: Check if color is valid
        if (!color || !Array.isArray(color) || color.length < 3) {
            console.error('Invalid color at index', i, ':', color);
            continue;
        }

        const [pr, pg, pb] = color;
        const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;

        if (dist < minDist) {
            minDist = dist;
            closestIdx = i;
        }
    }

    return closestIdx;
}

// Update palette with temperature adjustment
function updatePaletteTemperature(temp) {
    currentTemperature = temp;
    const basePalette = PALETTES[currentPaletteName];
    if (basePalette) {
        currentPalette = applyTemperature(basePalette, temp);
    }
}
