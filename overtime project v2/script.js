import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// =========================================
// CONFIGURATION
// =========================================

// --- POSITIONING ---
const startGap = 1.4;

// --- SIZE SETTINGS ---
const targetHeight = 0.5;
const widthScale = 0.06;
const depthScale = 1.0;

// --- SHINY METAL LOOK ---
// I made the red slightly lighter so it reflects more light
const objectColor = 0xAA2222;
const materialRoughness = 0.08; // Mirror polish
const materialMetalness = 0.9;  // Full Metal

// --- SCROLL SPEED ---
const rotationSpeed = 0.005;

// --- ALIGNMENT ---
const startX = 0;
const startY = 1.57;
const startZ = 0;

// =========================================

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

// This allows us to resize the WHOLE thing easily on mobile.
const mainGroup = new THREE.Group();
scene.add(mainGroup);

// --- SMOOTH TRANSITION VARIABLES ---
// We use these to store where we WANT the object to be
let targetGroupScale = new THREE.Vector3(1, 1, 1);
let targetGroupPosition = new THREE.Vector3(0, 0, 0);

// scene.background = new THREE.Color(0x050505); // Very dark grey background

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
// to increase quality on mobile screens
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 1. EXPOSURE (BRIGHTNESS)
// Higher number = Brighter Camera
renderer.toneMappingExposure = 2.3;

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// --- CAMERA ---
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, -2, 18);

// --- STATIC LIGHTS ---

// 2. AMBIENT LIGHT (Base Brightness)
// Increased to 3.0 so nothing is pitch black
const ambientLight = new THREE.AmbientLight(0xffffff, 3.0);
scene.add(ambientLight);

// 3. MAIN SUN LIGHT
// Increased to 8.0 (Very intense)
const mainLight = new THREE.DirectionalLight(0xffffff, 8.0);
mainLight.position.set(5, 10, 5);
mainLight.castShadow = true;
scene.add(mainLight);

// --- MOVING LIGHTS (THE FLASH) ---
// 4. POINT LIGHTS (Reflections)
// Increased power to 400
const movingLight1 = new THREE.PointLight(0xffffff, 400, 50);
movingLight1.castShadow = true;
scene.add(movingLight1);

const movingLight2 = new THREE.PointLight(0xffaa00, 200, 50); // Orange/Gold highlight
scene.add(movingLight2);


// --- MATERIAL ---
const metalMaterial = new THREE.MeshStandardMaterial({
  color: objectColor,
  roughness: materialRoughness,
  metalness: materialMetalness,
  side: THREE.DoubleSide
});

// --- LOAD MODEL ---
const loader = new GLTFLoader();

loader.load('./Steel_Blade.glb', (gltf) => {
  const model = gltf.scene;

  // Center
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);

  // Scale
  const size = box.getSize(new THREE.Vector3());
  if (size.y === 0) return;

  const baseScale = targetHeight / size.y;
  model.scale.set(
    baseScale * widthScale,
    baseScale,
    baseScale * depthScale
  );

  // Rotation
  model.rotation.set(startX, startY, startZ);

  // Material
  model.traverse((child) => {
    if (child.isMesh) {
      child.material = metalMaterial;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // Create Stack
  // --- ADD TO GROUP INSTEAD OF SCENE ---
  mainGroup.add(model); //  first blade

  const blade2 = model.clone();
  blade2.position.y = -startGap;
  // mainGroup.add(blade2); // Add to group

  const blade3 = model.clone();
  blade3.position.y = -startGap * 2;
  // mainGroup.add(blade3); // Add to group

  console.log("High Brightness Blades Loaded.");

  // Call resize once immediately to set the correct size for the current screen
  resizeModel();

}, undefined, (error) => {
  console.error("ERROR LOADING GLB:", error);
});

// --- ANIMATION ---
let targetRotation = 0;
let currentRotation = 0;

window.addEventListener('scroll', () => {
  targetRotation = window.scrollY * rotationSpeed;
});

function animate() {
  requestAnimationFrame(animate);

  const time = Date.now() * 0.002;

  // Animate Lights
  movingLight1.position.x = Math.sin(time) * 12;
  movingLight1.position.z = Math.cos(time) * 12;
  movingLight1.position.y = 4;

  movingLight2.position.x = Math.cos(time * 0.5) * 12;
  movingLight2.position.y = Math.sin(time * 0.5) * 10;
  movingLight2.position.z = 8;

  // Animate Camera/Objects
  camera.lookAt(0, -3, 0);

  // Rotate the GROUP (Rotates all blades together)
  currentRotation += (targetRotation - currentRotation) * 0.05;

  // Note: We apply rotation to the child objects inside the group 

  mainGroup.children.forEach(child => {
    child.rotation.x = startX + currentRotation;
  });

  mainGroup.scale.lerp(targetGroupScale, 0.1);
  mainGroup.position.lerp(targetGroupPosition, 0.1);

  renderer.render(scene, camera);
}
animate();

// =========================================
// RESIZE LOGIC (Responsive Size)
// =========================================

let lastWidth = 0;

function resizeModel(forceUpdate = false) {
  const currentWidth = window.innerWidth;

  // CHECK: If width hasn't changed (and it's not a forced update), STOP.
  // This prevents the "Jump" on mobile scrolling.
  if (!forceUpdate && currentWidth === lastWidth && currentWidth < 900) {
    return;
  }

  lastWidth = currentWidth;

  // Standard Resize
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  if (currentWidth < 600) {
    // MOBILE TARGETS
    targetGroupScale.set(0.6, 0.6, 0.6);
    targetGroupPosition.set(0, 0, 0);
  } else if (currentWidth < 1000) {
    // TABLET TARGETS
    targetGroupScale.set(0.8, 0.8, 0.8);
    targetGroupPosition.set(0, 0, 0);
  } else {
    // DESKTOP TARGETS
    targetGroupScale.set(1, 1, 1);
    targetGroupPosition.set(0, 0, 0);
  }
}

// Attach listener
window.addEventListener('resize', () => resizeModel(false));


// =========================================
// PART 2: LIGHT LEAK PAGE TRANSITION (FIXED)
// =========================================

function setupPageTransitions() {
  // 1. Create the Overlay
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

  // 2. Reveal Page (Fade Out)
  requestAnimationFrame(() => {
    setTimeout(() => {
      overlay.style.opacity = '0';
      overlay.style.backgroundPosition = '100% 100%';
    }, 50);
  });

  // 3. Handle Clicks
  const links = document.querySelectorAll('a');

  // Select the wrapper in HTML. 

  const contentWrapper = document.getElementById('page-wrapper') || document.body;

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetUrl = link.href;
      const isInternal = targetUrl.includes(window.location.hostname);

      if (isInternal) {
        const isAnchor = targetUrl.includes('#');
        if (!isAnchor) e.preventDefault();

        // A. Flash Overlay
        overlay.style.opacity = '1';
        overlay.style.backgroundPosition = '0% 0%';

        // B. Warp ONLY the Content Wrapper (Header stays safe)
        contentWrapper.style.transition = 'transform 0.1s cubic-bezier(0.45, 0, 0.55, 1), filter 0.1s ease-in';
        contentWrapper.style.transform = 'scale(1.05) scaleY(1.02)'; // Slightly reduced scale for cleaner look
        contentWrapper.style.filter = 'brightness(2) blur(3px)';

        // C. Navigate or Reset
        if (!isAnchor) {
          setTimeout(() => {
            window.location.href = targetUrl;
          }, 150);
        } else {
          // Reset effects if staying on the same page
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

// 3. Navigation Click Logic this part is disabled for now because it just target links.
/* const links = document.querySelectorAll('a');

 links.forEach(link => {
   link.addEventListener('click', (e) => {
     const targetUrl = link.href;
     const isInternal = targetUrl.includes(window.location.hostname);
     const isAnchor = targetUrl.includes('#');

     if (isInternal && !isAnchor) {
       e.preventDefault();

       // A. Trigger Light Leak (Flash + Background Move)
       overlay.style.opacity = '1';
       overlay.style.backgroundPosition = '0% 0%';

       // B. Trigger Distortion (The "Warp" look)
       // We use a larger scale and a vertical stretch to match the video
       document.body.style.transition = 'transform 0.4s cubic-bezier(0.45, 0, 0.55, 1), filter 0.4s ease-in';
       document.body.style.transform = 'scale(1.2) scaleY(1.1)';
       document.body.style.filter = 'brightness(2) contrast(1.2) blur(4px)';

       // C. Navigate
       setTimeout(() => {
         window.location.href = targetUrl;
       }, 450);
     }
   });
 });
}

setupPageTransitions();

*/