let video, canvas, ctx;
let animationId;
let currentFacingMode = 'environment';
let currentWidth = 640;
let currentHeight = 360;
let frameCount = 0;
let lastFpsUpdate = Date.now();

function updateCanvasSize() {
    // Set canvas internal resolution to match current selection
    canvas.width = currentWidth;
    canvas.height = currentHeight;
}

async function initCamera() {
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d', { willReadFrequently: true });

    updateCanvasSize();

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
    updateCanvasSize();

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

document.getElementById('paletteSelect').addEventListener('change', (e) => {
    const paletteName = e.target.value;
    currentPalette = PALETTES[paletteName];
    console.log('Palette switched to:', paletteName);
});

let uiHidden = false;

document.getElementById('snapshotBtn').addEventListener('click', () => {
    try {
        if (!canvas) {
            alert('Canvas not initialized. Start camera first.');
            return;
        }
        // Create a temporary link to download the canvas as an image
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `doscamera-snapshot-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('Snapshot saved:', link.download);
    } catch (err) {
        console.error('Snapshot failed:', err);
        alert('Snapshot failed: ' + err.message);
    }
});

document.getElementById('hideUIBtn').addEventListener('click', () => {
    uiHidden = !uiHidden;
    const hideBtn = document.getElementById('hideUIBtn');

    if (uiHidden) {
        // Hide all controls except hide button and snapshot button
        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('flipBtn').style.display = 'none';
        document.getElementById('resolutionSelect').style.display = 'none';
        document.getElementById('paletteSelect').style.display = 'none';
        document.getElementById('version').style.display = 'none';
        hideBtn.textContent = 'Show UI';
    } else {
        // Show all controls
        document.getElementById('startBtn').style.display = 'block';
        document.getElementById('flipBtn').style.display = 'block';
        document.getElementById('resolutionSelect').style.display = 'block';
        document.getElementById('paletteSelect').style.display = 'block';
        document.getElementById('version').style.display = 'block';
        hideBtn.textContent = 'Hide UI';
    }
});

// Auto-start camera on page load
window.addEventListener('DOMContentLoaded', () => {
    initCamera();
    document.getElementById('startBtn').textContent = 'Stop Camera';
});
