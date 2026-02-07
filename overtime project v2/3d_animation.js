import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// =========================================
// 1. CONFIGURATION
// =========================================

// --- ALIGNMENT CONSTANTS ---
// Set to 0 so the canvas covers the header
const CANVAS_TOP_OFFSET_REM = 0;

// --- LOGO MODE SETTINGS ---
const LOGO_SCALE = 0.30;
// Adjust this to move it UP/DOWN relative to the logo
// Positive = UP, Negative = DOWN
const LOGO_Y_OFFSET = -3.1;

// --- SCROLL TRIGGER ---
// The pixel point where the blade detaches from the text and flies to the logo.
let TRIGGER_POINT = 400;

// --- MODEL SETTINGS ---
const startGap = 1.4;
const targetHeight = 0.5;
const widthScale = 0.06;
const depthScale = 1.0;

// --- MATERIAL SETTINGS ---
const objectColor = 0xAA2222;
const materialRoughness = 0.08;
const materialMetalness = 0.9;

// --- ANIMATION SETTINGS ---
const rotationSpeed = 0.005;
const startX = 0;
const startY = 1.57;
const startZ = 0;

// =========================================
// 2. SCENE SETUP
// =========================================

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

const mainGroup = new THREE.Group();
scene.add(mainGroup);

// Variables for smooth animations
let targetRotation = 0;
let currentRotation = 0;


const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMappingExposure = 2.3;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, -2, 18);

// =========================================
// 3. LIGHTING
// =========================================

const ambientLight = new THREE.AmbientLight(0xffffff, 3.0);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 8.0);
mainLight.position.set(5, 10, 5);
mainLight.castShadow = true;
scene.add(mainLight);

const movingLight1 = new THREE.PointLight(0xffffff, 400, 50);
movingLight1.castShadow = true;
scene.add(movingLight1);

const movingLight2 = new THREE.PointLight(0xffaa00, 200, 50);
scene.add(movingLight2);

// =========================================
// 4. LOAD MODEL
// =========================================

const metalMaterial = new THREE.MeshStandardMaterial({
  color: objectColor,
  roughness: materialRoughness,
  metalness: materialMetalness,
  side: THREE.DoubleSide
});

const loader = new GLTFLoader();

loader.load('./Steel_Blade.glb', (gltf) => {
  const model = gltf.scene;

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);

  const size = box.getSize(new THREE.Vector3());
  if (size.y === 0) return;

  const baseScale = targetHeight / size.y;
  model.scale.set(
    baseScale * widthScale,
    baseScale,
    baseScale * depthScale
  );

  model.rotation.set(startX, startY, startZ);
  model.traverse((child) => {
    if (child.isMesh) {
      child.material = metalMaterial;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  mainGroup.add(model);

  const blade2 = model.clone();
  blade2.position.y = -startGap;
  // mainGroup.add(blade2); 

  const blade3 = model.clone();
  blade3.position.y = -startGap * 2;
  // mainGroup.add(blade3); 

  console.log("Model Loaded.");

}, undefined, (error) => {
  console.error("ERROR LOADING GLB:", error);
});

// =========================================
// 5. RESIZE LOGIC
// =========================================

let lastWidth = window.innerWidth;

function resizeModel(forceUpdate = false) {
  // Measure Container (Fixes Safari 100svh bug)
  const rect = container.getBoundingClientRect();
  const currentWidth = rect.width;
  const currentHeight = rect.height;

  const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
  if (!forceUpdate && isTouchDevice && window.innerWidth === lastWidth) {
    return;
  }
  lastWidth = window.innerWidth;

  camera.aspect = currentWidth / currentHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(currentWidth, currentHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

resizeModel(true);
window.addEventListener('resize', () => resizeModel(false));


// =========================================
// 6. TARGET SWITCHING LOGIC (Mobile Stability Fix + Custom Values)
// =========================================

// Track smoothing variables
let smoothX = 0;
let smoothY = 0;
let smoothScaleX = 1;
let smoothScaleY = 1;
let smoothScaleZ = 1;

// --- STABILITY VARIABLES ---
let cachedWidth = 0;
let cachedPixelsPerUnit = 0;
let cachedScreenCenterY = 0;
let cachedScreenCenterX = 0;

function updateBladePosition() {
  const homeSection = document.querySelector('.home');
  const logoElement = document.querySelector('.logo');

  if (!homeSection || !logoElement) return;

  // --- A. STABLE MATH CALCULATION ---
  // We check if the Width has changed (Rotation or Desktop Resize)
  // If width is the same, we REUSE the old height math. 
  // This ignores the vertical "jump" when the mobile toolbar hides.
  const currentWidth = window.innerWidth;

  if (Math.abs(currentWidth - cachedWidth) > 2 || cachedPixelsPerUnit === 0) {
    // Recalculate ONLY if width changed
    cachedWidth = currentWidth;

    // Use the Container height (which uses svh) for stability, NOT window.innerHeight
    const rect = container.getBoundingClientRect();
    const stableHeight = rect.height;

    const dist = camera.position.z - 0;
    const vFOV = THREE.MathUtils.degToRad(camera.fov);
    const visibleHeight_units = 2 * Math.tan(vFOV / 2) * dist;

    cachedPixelsPerUnit = stableHeight / visibleHeight_units;
    cachedScreenCenterY = stableHeight / 2;
    cachedScreenCenterX = currentWidth / 2;
  }

  // Use the Locked/Cached values for math
  const pixelsPerUnit = cachedPixelsPerUnit;
  const screenCenterY = cachedScreenCenterY;
  const screenCenterX = cachedScreenCenterX;


  // --- B. DEFINE TARGETS ---
  let activeTargetY = 0;
  let activeTargetX = 0;

  let targetWidth = widthScale;
  let targetHeightScale = 1.0;
  let targetDepth = depthScale;

  let overallScale = 1.0;

  // --- DYNAMIC TRIGGER ---
  let effectiveTrigger = TRIGGER_POINT;
  if (window.innerWidth < 600) effectiveTrigger = 300; // Your custom trigger

  // Check Scroll Position
  if (window.scrollY < effectiveTrigger) {
    // =========================================
    // MODE 1: HERO
    // =========================================

    const homeRect = homeSection.getBoundingClientRect();
    const textCenterY = homeRect.top + (homeRect.height / 2);
    const heroGapY = textCenterY - screenCenterY;

    let heroOffset = 0;

    if (window.innerWidth < 600) {
      // [MOBILE HERO]
      overallScale = 0.6;
      heroOffset = -2.89;
    } else if (window.innerWidth < 1000) {
      // [TABLET HERO]
      overallScale = 0.5;
      heroOffset = -2.87;
    } else {
      // [DESKTOP HERO]
      overallScale = 1.0;
      heroOffset = -2.75;
    }

    activeTargetY = -(heroGapY / pixelsPerUnit) + heroOffset;
    activeTargetX = 0;

    targetWidth *= overallScale;
    targetHeightScale *= overallScale;
    targetDepth *= overallScale;

  } else {
    // =========================================
    // MODE 2: LOGO
    // =========================================

    let currentLogoOffsetY = LOGO_Y_OFFSET;
    let manualOffsetX = 0;

    // --- MODE 2 MODEL SETTINGS ---
    let m2_Width = 0.06;
    let m2_Height = 1.0;
    let m2_Depth = 1.0;
    let m2_Overall = LOGO_SCALE;

    if (window.innerWidth < 600) {
      // [MOBILE LOGO]
      m2_Overall = 0.17;
      currentLogoOffsetY = -3.0;
      manualOffsetX = -0.1;

      m2_Width = 0.12;
      m2_Height = 1.0;
    }
    else if (window.innerWidth < 1000) {
      // [TABLET LOGO]
      m2_Overall = 0.15;
      currentLogoOffsetY = -3.1;
      manualOffsetX = 0.15;

      m2_Width = 0.10;
      m2_Height = 1.0;
    }
    else {
      // [DESKTOP LOGO]
      m2_Overall = LOGO_SCALE;
      currentLogoOffsetY = LOGO_Y_OFFSET;
      manualOffsetX = 0.15;

      m2_Width = 0.05;
      m2_Height = 0.5;
    }

    // 1. CALCULATE Y
    const logoRect = logoElement.getBoundingClientRect();
    const logoTargetY = logoRect.bottom;
    const logoGapY = logoTargetY - screenCenterY;
    activeTargetY = -(logoGapY / pixelsPerUnit) + currentLogoOffsetY;

    // 2. CALCULATE X
    const logoTargetX = logoRect.left + (logoRect.width / 2);
    const logoGapX = logoTargetX - screenCenterX;
    activeTargetX = (logoGapX / pixelsPerUnit) + manualOffsetX;

    // 3. SET DIMENSIONS
    targetWidth = m2_Width * m2_Overall;
    targetHeightScale = m2_Height * m2_Overall;
    targetDepth = m2_Depth * m2_Overall;
  }

  // --- C. APPLY SMOOTHING ---
  smoothY += (activeTargetY - smoothY) * 0.1;
  smoothX += (activeTargetX - smoothX) * 0.1;

  // Scale Smoothing
  smoothScaleX += (targetWidth - smoothScaleX) * 0.1;
  smoothScaleY += (targetHeightScale - smoothScaleY) * 0.1;
  smoothScaleZ += (targetDepth - smoothScaleZ) * 0.1;

  // --- D. UPDATE OBJECT ---
 mainGroup.position.y = smoothY;
 mainGroup.position.x = smoothX;

  mainGroup.scale.set(
    smoothScaleX / widthScale,
    smoothScaleY,
    smoothScaleZ / depthScale
  );
}
// =========================================
// 7. ANIMATION LOOP
// =========================================

window.addEventListener('scroll', () => {
  targetRotation = window.scrollY * rotationSpeed;
});

function animate() {
  requestAnimationFrame(animate);

  const time = Date.now() * 0.002;

  // Lights
  movingLight1.position.x = Math.sin(time) * 12;
  movingLight1.position.z = Math.cos(time) * 12;
  movingLight1.position.y = 4;

  movingLight2.position.x = Math.cos(time * 0.5) * 12;
  movingLight2.position.y = Math.sin(time * 0.5) * 10;
  movingLight2.position.z = 8;

  camera.lookAt(0, -3, 0);

  // Rotation
  currentRotation += (targetRotation - currentRotation) * 0.05;
  mainGroup.children.forEach(child => {
    child.rotation.x = startX + currentRotation;
  });

  // Position & Scale Logic
  updateBladePosition();

  renderer.render(scene, camera);
}
animate();

// =========================================
// 8. PAGE TRANSITIONS
// =========================================
function setupPageTransitions() {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(255,165,0,1) 50%, rgba(255,255,255,1) 100%)';
  overlay.style.backgroundSize = '200% 200%';
  overlay.style.zIndex = '100000';
  overlay.style.pointerEvents = 'none';
  overlay.style.transition = 'opacity 0.1s ease-in-out, background-position 0.1s ease-in-out';
  overlay.style.opacity = '1';
  overlay.style.backgroundPosition = '0% 0%';

  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    setTimeout(() => {
      overlay.style.opacity = '0';
      overlay.style.backgroundPosition = '100% 100%';
    }, 50);
  });

  const links = document.querySelectorAll('a');
  const contentWrapper = document.getElementById('page-wrapper') || document.body;

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetUrl = link.href;
      const isInternal = targetUrl.includes(window.location.hostname);

      if (isInternal) {
        const isAnchor = targetUrl.includes('#');
        if (!isAnchor) e.preventDefault();

        overlay.style.opacity = '1';
        overlay.style.backgroundPosition = '0% 0%';
        contentWrapper.style.transition = 'transform 0.1s cubic-bezier(0.45, 0, 0.55, 1), filter 0.1s ease-in';
        contentWrapper.style.transform = 'scale(1.05) scaleY(1.02)';
        contentWrapper.style.filter = 'brightness(2) blur(3px)';

        if (!isAnchor) {
          setTimeout(() => {
            window.location.href = targetUrl;
          }, 150);
        } else {
          setTimeout(() => {
            overlay.style.opacity = '0';
            overlay.style.backgroundPosition = '100% 100%';
            contentWrapper.style.transform = 'none';
            contentWrapper.style.filter = 'none';
          }, 200);
        }
      }
    });
  });
}
setupPageTransitions();