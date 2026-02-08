let video, canvas, ctx;
let animationId;
let currentFacingMode = 'environment';
let currentLongEdge = 640; // Resolution setting: long edge only
let frameCount = 0;
let lastFpsUpdate = Date.now();

// Camera devices
let videoDevices = [];
let currentDeviceIndex = 0;

// Gesture tracking
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let isTouching = false;
let gestureMode = null; // 'exposure' or 'temperature'
const GESTURE_THRESHOLD = 30; // pixels to determine gesture direction
const TAP_MAX_DURATION = 300; // ms

// UI state
let uiHidden = false;

// Gallery
const GALLERY_KEY = 'dither_gallery';

// Preview state
let currentPreviewData = null;
let currentSaveScale = 1;

function getCanvasDimensions() {
    const viewportAspect = window.innerWidth / window.innerHeight;
    const isPortrait = viewportAspect < 1;
    
    // Calculate dimensions based on viewport aspect ratio
    // Long edge is fixed, short edge derived from actual screen ratio
    if (isPortrait) {
        // Portrait: height is long edge
        const height = currentLongEdge;
        const width = Math.round(height * viewportAspect);
        return { width, height };
    } else {
        // Landscape: width is long edge
        const width = currentLongEdge;
        const height = Math.round(width / viewportAspect);
        return { width, height };
    }
}

function updateCanvasSize() {
    const { width, height } = getCanvasDimensions();
    canvas.width = width;
    canvas.height = height;
    updateCanvasDisplaySize();
}

function updateCanvasDisplaySize() {
    if (!canvas) return;
    
    // Fill viewport completely - aspect now matches
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.transform = 'none';
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

function changeResolution(longEdge) {
    const wasRunning = animationId !== null;
    if (wasRunning) stopCamera();

    currentLongEdge = longEdge;
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
    touchStartTime = performance.now();
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
    if (!gestureMode && (performance.now() - touchStartTime) < TAP_MAX_DURATION) {
        pickHueFromViewfinder(touchStartX, touchStartY);
    }
    isTouching = false;
    gestureMode = null;
    hideOverlays();
}

// Mouse event handlers for desktop testing
let mouseDown = false;
let mouseStartX = 0;
let mouseStartY = 0;
let mouseStartTime = 0;

function handleMouseDown(e) {
    mouseDown = true;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
    mouseStartTime = performance.now();
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
    if (!gestureMode && (performance.now() - mouseStartTime) < TAP_MAX_DURATION) {
        pickHueFromViewfinder(mouseStartX, mouseStartY);
    }
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

// ===== TAP-TO-PICK HUE =====

function pickHueFromViewfinder(screenX, screenY) {
    if (currentPaletteName !== 'VGA') return;

    // Map screen coords → video coords (canvas fills viewport 1:1)
    const videoX = (screenX / window.innerWidth) * video.videoWidth;
    const videoY = (screenY / window.innerHeight) * video.videoHeight;

    // Sample 5×5 region averaged onto 1×1 temp canvas
    const tmp = document.createElement('canvas');
    tmp.width = 1;
    tmp.height = 1;
    const tctx = tmp.getContext('2d');
    tctx.drawImage(video, videoX - 2, videoY - 2, 5, 5, 0, 0, 1, 1);
    const px = tctx.getImageData(0, 0, 1, 1).data;

    const hue = rgbToHue(px[0], px[1], px[2]);
    if (hue < 0) return; // achromatic — ignore

    setVGABaseHue(hue);
    showTapIndicator(screenX, screenY, px[0], px[1], px[2]);
}

function showTapIndicator(x, y, r, g, b) {
    const el = document.getElementById('tapIndicator');
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.borderColor = `rgb(${r},${g},${b})`;
    el.classList.remove('hidden', 'fade-out');
    // Force reflow to restart animation
    el.offsetHeight;
    el.classList.add('fade-out');
    setTimeout(() => el.classList.add('hidden'), 500);
}

function hideOverlays() {
    document.getElementById('exposureOverlay').classList.add('hidden');
    document.getElementById('tempOverlay').classList.add('hidden');
}

// ===== DROP-UP MANAGEMENT =====

function closeAllDropups() {
    document.getElementById('resolutionDropup').classList.add('hidden');
    document.getElementById('paletteDropup').classList.add('hidden');
    document.getElementById('resolutionBtn').classList.remove('active');
    document.getElementById('paletteBtn').classList.remove('active');
}

function getResolutionLabel(longEdge) {
    const viewportAspect = window.innerWidth / window.innerHeight;
    const isPortrait = viewportAspect < 1;
    
    if (isPortrait) {
        const width = Math.round(longEdge * viewportAspect);
        return `${width}×${longEdge}`;
    } else {
        const height = Math.round(longEdge / viewportAspect);
        return `${longEdge}×${height}`;
    }
}

function updateResolutionLabels() {
    document.querySelectorAll('.resolution-option').forEach(btn => {
        const longEdge = parseInt(btn.dataset.res);
        btn.textContent = getResolutionLabel(longEdge);
    });
    // Update trigger button too
    document.getElementById('resolutionBtn').textContent = getResolutionLabel(currentLongEdge);
}

function toggleDropup(dropupId, btnId) {
    const dropup = document.getElementById(dropupId);
    const btn = document.getElementById(btnId);
    const isOpen = !dropup.classList.contains('hidden');
    
    closeAllDropups();
    
    if (!isOpen) {
        // Update resolution labels before showing
        if (dropupId === 'resolutionDropup') {
            updateResolutionLabels();
        }
        dropup.classList.remove('hidden');
        btn.classList.add('active');
    }
}

// Resolution button - toggle drop-up
document.getElementById('resolutionBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropup('resolutionDropup', 'resolutionBtn');
});

// Palette button - toggle drop-up
document.getElementById('paletteBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropup('paletteDropup', 'paletteBtn');
});

// Close drop-ups when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropup') && !e.target.closest('.toolbar-btn')) {
        closeAllDropups();
    }
});

// ===== PALETTE SELECTION =====

document.querySelectorAll('.palette-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const paletteName = btn.dataset.palette;
        
        const newPalette = PALETTES[paletteName];
        if (!newPalette) {
            console.error('Palette not found:', paletteName);
            return;
        }

        // Update active state in drop-up
        document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update trigger button text
        document.getElementById('paletteBtn').textContent = btn.textContent;

        currentPaletteName = paletteName;
        updatePaletteTemperature(currentTemperature);
        
        closeAllDropups();
    });
});

// ===== RESOLUTION SELECTION =====

document.querySelectorAll('.resolution-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const longEdge = parseInt(btn.dataset.res);
        
        changeResolution(longEdge);
        
        // Update trigger button text with full resolution
        document.getElementById('resolutionBtn').textContent = getResolutionLabel(longEdge);
        
        // Update active state in drop-up
        document.querySelectorAll('.resolution-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        closeAllDropups();
    });
});

// Set initial active states
document.querySelector('.resolution-option[data-res="640"]').classList.add('active');
document.querySelector('.palette-btn[data-palette="VGA"]').classList.add('active');

// Shutter button - save to gallery only (no auto-download)
document.getElementById('shutterBtn').addEventListener('click', () => {
    try {
        if (!canvas) {
            alert('Canvas not initialized. Start camera first.');
            return;
        }

        const dataUrl = canvas.toDataURL('image/png');
        const timestamp = Date.now();

        // Save to localStorage only - user can download from gallery preview
        saveToGallery(dataUrl, timestamp);

        // Brief visual feedback
        const btn = document.getElementById('shutterBtn');
        btn.style.opacity = '0.5';
        setTimeout(() => btn.style.opacity = '1', 100);
    } catch (err) {
        console.error('Snapshot failed:', err);
        alert('Snapshot failed: ' + err.message);
    }
});

// ===== GALLERY =====

function getGallery() {
    try {
        return JSON.parse(localStorage.getItem(GALLERY_KEY)) || [];
    } catch {
        return [];
    }
}

function saveToGallery(dataUrl, timestamp) {
    const gallery = getGallery();
    gallery.unshift({ id: timestamp, dataUrl });
    
    // Keep max 50 items to avoid localStorage limit
    if (gallery.length > 50) gallery.pop();
    
    try {
        localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery));
    } catch (e) {
        console.warn('Gallery storage full, removing oldest');
        gallery.pop();
        localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery));
    }
}

function deleteFromGallery(id) {
    const gallery = getGallery().filter(item => item.id !== id);
    localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery));
    renderGallery();
}

function renderGallery() {
    const gallery = getGallery();
    const grid = document.getElementById('galleryGrid');
    const empty = document.getElementById('galleryEmpty');

    grid.innerHTML = '';

    if (gallery.length === 0) {
        empty.style.display = 'block';
        grid.style.display = 'none';
        return;
    }

    empty.style.display = 'none';
    grid.style.display = 'grid';

    gallery.forEach(item => {
        const thumb = document.createElement('div');
        thumb.className = 'gallery-thumb';
        thumb.innerHTML = `<img src="${item.dataUrl}" alt="snapshot">`;

        // Tap to open preview
        thumb.addEventListener('click', () => {
            openPreview(item.dataUrl, item.id);
        });

        // Long press to delete
        let pressTimer;
        thumb.addEventListener('touchstart', (e) => {
            pressTimer = setTimeout(() => {
                if (confirm('Delete this snapshot?')) {
                    deleteFromGallery(item.id);
                }
            }, 500);
        });
        thumb.addEventListener('touchend', () => clearTimeout(pressTimer));
        thumb.addEventListener('touchmove', () => clearTimeout(pressTimer));

        grid.appendChild(thumb);
    });
}

// ===== PREVIEW =====

function openPreview(dataUrl, id) {
    currentPreviewData = { dataUrl, id };
    document.getElementById('previewImage').src = dataUrl;
    document.getElementById('previewOverlay').classList.remove('hidden');
}

function closePreview() {
    document.getElementById('previewOverlay').classList.add('hidden');
    document.getElementById('scaleDropup').classList.add('hidden');
    currentPreviewData = null;
}

async function shareImage() {
    if (!currentPreviewData) return;

    // Convert dataUrl to blob for sharing
    const response = await fetch(currentPreviewData.dataUrl);
    const blob = await response.blob();
    const file = new File([blob], `dither-${currentPreviewData.id}.png`, { type: 'image/png' });

    if (navigator.share && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: 'di_ther snapshot'
            });
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Share failed:', err);
            }
        }
    } else {
        // Fallback: copy to clipboard or alert
        alert('Sharing not supported on this device. Use Save instead.');
    }
}

function saveImage() {
    if (!currentPreviewData) return;

    const scale = currentSaveScale;

    if (scale === 1) {
        // Direct download at original size
        downloadDataUrl(currentPreviewData.dataUrl, currentPreviewData.id);
    } else {
        // Scale up with nearest neighbor
        const img = new Image();
        img.onload = () => {
            const scaledCanvas = document.createElement('canvas');
            scaledCanvas.width = img.width * scale;
            scaledCanvas.height = img.height * scale;
            const sctx = scaledCanvas.getContext('2d');

            // Nearest neighbor scaling
            sctx.imageSmoothingEnabled = false;
            sctx.drawImage(img, 0, 0, scaledCanvas.width, scaledCanvas.height);

            const scaledUrl = scaledCanvas.toDataURL('image/png');
            downloadDataUrl(scaledUrl, currentPreviewData.id, scale);
        };
        img.src = currentPreviewData.dataUrl;
    }
}

function downloadDataUrl(dataUrl, id, scale = 1) {
    const suffix = scale > 1 ? `-${scale}x` : '';
    const link = document.createElement('a');
    link.download = `dither-${id}${suffix}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function toggleScaleDropup() {
    document.getElementById('scaleDropup').classList.toggle('hidden');
}

function setScale(scale) {
    currentSaveScale = scale;
    document.querySelectorAll('.scale-option').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.scale) === scale);
    });
    document.getElementById('scaleDropup').classList.add('hidden');
}

// Preview event listeners
document.getElementById('previewClose').addEventListener('click', closePreview);
document.getElementById('shareBtn').addEventListener('click', shareImage);
document.getElementById('saveBtn').addEventListener('click', saveImage);
document.getElementById('scaleToggle').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleScaleDropup();
});

document.querySelectorAll('.scale-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setScale(parseInt(btn.dataset.scale));
    });
});

// Close preview on background click
document.getElementById('previewOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'previewOverlay' || e.target.classList.contains('preview-image-container')) {
        closePreview();
    }
});

// Close scale dropup when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.save-combo')) {
        document.getElementById('scaleDropup').classList.add('hidden');
    }
});

function openGallery() {
    renderGallery();
    document.getElementById('galleryOverlay').classList.remove('hidden');
}

function closeGallery() {
    document.getElementById('galleryOverlay').classList.add('hidden');
}

document.getElementById('galleryBtn').addEventListener('click', openGallery);
document.getElementById('galleryClose').addEventListener('click', closeGallery);

// Close gallery on overlay background click
document.getElementById('galleryOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'galleryOverlay') closeGallery();
});

// Auto-start camera on page load
window.addEventListener('DOMContentLoaded', () => {
    initCamera();
    initGestures();
    updateResolutionLabels();
});

// Handle resize and orientation change
window.addEventListener('resize', () => {
    updateCanvasDisplaySize();
    updateResolutionLabels();
});
