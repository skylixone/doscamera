let video, canvas, ctx;
let animationId;
let currentFacingMode = 'environment';
let currentWidth = 640;
let currentHeight = 360;
let frameCount = 0;
let lastFpsUpdate = Date.now();

// Camera devices
let videoDevices = [];
let currentDeviceIndex = 0;
let isZoomed = false;

// Gesture tracking
let touchStartX = 0;
let touchStartY = 0;
let isTouching = false;
let gestureMode = null; // 'exposure' or 'temperature'
const GESTURE_THRESHOLD = 30; // pixels to determine gesture direction

// UI state
let uiHidden = false;

function updateCanvasSize() {
    const viewportAspect = window.innerWidth / window.innerHeight;
    const isPortrait = viewportAspect < 1;
    
    // Flip dimensions in portrait mode (9:16 instead of 16:9)
    canvas.width = isPortrait ? currentHeight : currentWidth;
    canvas.height = isPortrait ? currentWidth : currentHeight;
    
    updateCanvasDisplaySize();
}

function updateCanvasDisplaySize() {
    if (!canvas) return;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const viewportAspect = viewportWidth / viewportHeight;
    
    // Determine if we're in portrait or landscape
    // Portrait: viewport is taller than wide (aspect < 1)
    // Landscape: viewport is wider than tall (aspect > 1)
    const isPortrait = viewportAspect < 1;
    
    // Use appropriate dimensions based on orientation
    // Portrait: flip to 9:16 (tall)
    // Landscape: keep 16:9 (wide)
    const canvasWidth = isPortrait ? currentHeight : currentWidth;
    const canvasHeight = isPortrait ? currentWidth : currentHeight;
    
    // Scale to fill viewport (object-fit: cover)
    const scaleX = viewportWidth / canvasWidth;
    const scaleY = viewportHeight / canvasHeight;
    const scale = Math.max(scaleX, scaleY);
    
    const displayWidth = canvasWidth * scale;
    const displayHeight = canvasHeight * scale;
    
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    canvas.style.position = 'fixed';
    canvas.style.left = '50%';
    canvas.style.top = '50%';
    canvas.style.transform = 'translate(-50%, -50%)';
    
    console.log('Orientation:', isPortrait ? 'portrait' : 'landscape', 'Canvas:', displayWidth.toFixed(0), 'x', displayHeight.toFixed(0));
}

async function enumerateCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = devices.filter(d => d.kind === 'videoinput');
        console.log('Found cameras:', videoDevices.length);
        videoDevices.forEach((d, i) => console.log(`  [${i}] ${d.label}`));
    } catch (err) {
        console.error('Failed to enumerate cameras:', err);
    }
}

async function initCamera() {
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d', { willReadFrequently: true });

    updateCanvasSize();
    
    // Enumerate cameras on first init
    if (videoDevices.length === 0) {
        await enumerateCameras();
    }

    try {
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        
        // Use deviceId if we have multiple cameras and zoom is active
        if (videoDevices.length > 1 && isZoomed && videoDevices[1]) {
            constraints.video.deviceId = { exact: videoDevices[1].deviceId };
        } else {
            constraints.video.facingMode = currentFacingMode;
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

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
    const frameStart = performance.now();

    // Use actual canvas dimensions (may be flipped in portrait)
    const w = canvas.width;
    const h = canvas.height;

    // Draw video frame to canvas at target resolution
    ctx.drawImage(video, 0, 0, w, h);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, w, h);

    const ditherStart = performance.now();
    // Apply dithering and palette reduction
    applyDithering(imageData, w, h);
    const ditherEnd = performance.now();

    // Log slow frames (>100ms for dithering)
    const ditherTime = ditherEnd - ditherStart;
    if (ditherTime > 100) {
        console.warn('Slow dither detected:', ditherTime.toFixed(2) + 'ms', 'Palette:', currentPalette?.length, 'colors');
    }

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

// ===== GESTURE HANDLING =====

function initGestures() {
    canvas = document.getElementById('canvas');
    
    // Touch events
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    
    // Mouse events (for desktop testing)
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
}

function handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isTouching = true;
    gestureMode = null;
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!isTouching || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touchStartY - touch.clientY; // Inverted: up = positive
    
    // Determine gesture mode if not set
    if (!gestureMode) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        
        if (absY > GESTURE_THRESHOLD && absY > absX) {
            gestureMode = 'exposure';
            showExposureOverlay();
        } else if (absX > GESTURE_THRESHOLD && absX > absY) {
            gestureMode = 'temperature';
            showTempOverlay();
        }
    }
    
    // Apply gesture
    if (gestureMode === 'exposure') {
        updateExposureFromGesture(deltaY);
    } else if (gestureMode === 'temperature') {
        updateTemperatureFromGesture(deltaX);
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    isTouching = false;
    gestureMode = null;
    hideOverlays();
}

// Mouse event handlers for desktop testing
let mouseDown = false;
let mouseStartX = 0;
let mouseStartY = 0;

function handleMouseDown(e) {
    mouseDown = true;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
    gestureMode = null;
}

function handleMouseMove(e) {
    if (!mouseDown) return;
    
    const deltaX = e.clientX - mouseStartX;
    const deltaY = mouseStartY - e.clientY;
    
    // Determine gesture mode if not set
    if (!gestureMode) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        
        if (absY > GESTURE_THRESHOLD && absY > absX) {
            gestureMode = 'exposure';
            showExposureOverlay();
        } else if (absX > GESTURE_THRESHOLD && absX > absY) {
            gestureMode = 'temperature';
            showTempOverlay();
        }
    }
    
    if (gestureMode === 'exposure') {
        updateExposureFromGesture(deltaY);
    } else if (gestureMode === 'temperature') {
        updateTemperatureFromGesture(deltaX);
    }
}

function handleMouseUp(e) {
    mouseDown = false;
    gestureMode = null;
    hideOverlays();
}

// ===== EXPOSURE CONTROL =====

const MAX_EXPOSURE_DELTA = 150; // pixels for full range

function updateExposureFromGesture(deltaY) {
    // Map deltaY to EV range (-2 to +2)
    const ev = (deltaY / MAX_EXPOSURE_DELTA) * 2;
    setExposureCompensation(ev);
    updateExposureUI();
}

function showExposureOverlay() {
    const overlay = document.getElementById('exposureOverlay');
    overlay.classList.remove('hidden');
    updateExposureUI();
}

function updateExposureUI() {
    const overlay = document.getElementById('exposureOverlay');
    const fill = overlay.querySelector('.exposure-fill');
    const value = overlay.querySelector('.exposure-value');
    
    // Update fill height based on EV
    const percentage = ((exposureCompensation + 2) / 4) * 100;
    fill.style.height = percentage + '%';
    
    // Update text
    const sign = exposureCompensation >= 0 ? '+' : '';
    value.textContent = `EV: ${sign}${exposureCompensation.toFixed(1)}`;
    
    // Color coding
    if (exposureCompensation > 0) {
        fill.style.background = 'linear-gradient(to top, #ffaa00, #ffdd44)';
    } else if (exposureCompensation < 0) {
        fill.style.background = 'linear-gradient(to top, #0044aa, #4488cc)';
    } else {
        fill.style.background = '#888';
    }
}

// ===== TEMPERATURE CONTROL =====

const MAX_TEMP_DELTA = 200; // pixels for full range

function updateTemperatureFromGesture(deltaX) {
    // Map deltaX to temperature range (-1 to +1)
    const temp = deltaX / MAX_TEMP_DELTA;
    updatePaletteTemperature(temp);
    updateTempUI();
}

function showTempOverlay() {
    const overlay = document.getElementById('tempOverlay');
    overlay.classList.remove('hidden');
    updateTempUI();
}

function updateTempUI() {
    const overlay = document.getElementById('tempOverlay');
    const fill = overlay.querySelector('.temp-fill');
    const value = overlay.querySelector('.temp-value');
    
    // Update fill width based on temperature
    const percentage = ((currentTemperature + 1) / 2) * 100;
    fill.style.width = percentage + '%';
    
    // Update text
    const tempPercent = Math.round(currentTemperature * 100);
    const sign = tempPercent >= 0 ? '+' : '';
    value.textContent = `TEMP: ${sign}${tempPercent}%`;
    
    // Color coding
    if (currentTemperature > 0) {
        fill.style.background = 'linear-gradient(to right, #888, #ff8844)';
    } else if (currentTemperature < 0) {
        fill.style.background = 'linear-gradient(to right, #4488ff, #888)';
    } else {
        fill.style.background = '#888';
    }
}

function hideOverlays() {
    document.getElementById('exposureOverlay').classList.add('hidden');
    document.getElementById('tempOverlay').classList.add('hidden');
}

// ===== TOOLBAR EVENT LISTENERS =====

// Palette buttons
document.querySelectorAll('.palette-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const paletteName = btn.dataset.palette;
        console.log('Switching palette to:', paletteName);

        const newPalette = PALETTES[paletteName];
        if (!newPalette) {
            console.error('Palette not found:', paletteName);
            return;
        }

        // Update active state
        document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        currentPaletteName = paletteName;
        // Apply temperature to new base palette
        updatePaletteTemperature(currentTemperature);
        
        console.log('Palette loaded:', paletteName, 'Colors:', currentPalette.length);
    });
});

// Resolution button - toggle resolution mode
let resolutionModeActive = false;

document.getElementById('resolutionBtn').addEventListener('click', () => {
    const paletteButtons = document.getElementById('paletteButtons');
    const resolutionOptions = document.getElementById('resolutionOptions');
    const resolutionBtn = document.getElementById('resolutionBtn');
    
    if (resolutionModeActive) {
        // Hide resolution options, show palette
        resolutionOptions.classList.add('hidden');
        paletteButtons.classList.remove('hidden');
        resolutionBtn.classList.remove('active');
        resolutionModeActive = false;
    } else {
        // Show resolution options, hide palette
        paletteButtons.classList.add('hidden');
        resolutionOptions.classList.remove('hidden');
        resolutionBtn.classList.add('active');
        resolutionModeActive = true;
    }
});

// Resolution options
document.querySelectorAll('.resolution-option').forEach(btn => {
    btn.addEventListener('click', () => {
        const [width, height] = btn.dataset.res.split('x').map(Number);
        
        // Change resolution
        changeResolution(width, height);
        
        // Update resolution button text
        document.getElementById('resolutionBtn').textContent = `${width}×${height}`;
        
        // Update active state
        document.querySelectorAll('.resolution-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Switch back to palette buttons
        const resolutionBtn = document.getElementById('resolutionBtn');
        document.getElementById('resolutionOptions').classList.add('hidden');
        document.getElementById('paletteButtons').classList.remove('hidden');
        resolutionBtn.classList.remove('active');
        resolutionModeActive = false;
    });
});

// Shutter button
document.getElementById('shutterBtn').addEventListener('click', () => {
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

// Auto-start camera on page load
window.addEventListener('DOMContentLoaded', () => {
    initCamera();
    initGestures();
});

// Handle resize and orientation change
window.addEventListener('resize', () => {
    updateCanvasDisplaySize();
});
