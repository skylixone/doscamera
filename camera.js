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
