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
