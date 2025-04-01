
import * as THREE from 'https://esm.sh/three@0.156.1';
import { GLTFLoader } from 'https://esm.sh/three@0.156.1/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://esm.sh/three@0.156.1/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls, mixer, animations = [], model;
let animationReversed = false;

// Scene Setup
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xe9fcff, 3);
directionalLight.position.set(2, 2, -1).normalize();
scene.add(directionalLight);

// Orbit Controls
controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
camera.position.set(0, .4, 0.3);
controls.target.set(0, 0, 0);
controls.update();

// Clock for animation mixer
const clock = new THREE.Clock();

// Load GLB
const loader = new GLTFLoader();

loader.load(
  'models/bookanim.glb',
  function (gltf) {
    if (!gltf.scene) {
      console.error("❌ GLB model scene is undefined.");
      return;
    }

    model = gltf.scene;
    scene.add(model);

     // 💡 Rotate the book here:
     model.rotation.x = 0;  // Common Blender fix (Z-up to Y-up)
     model.rotation.y = -Math.PI / 2;             // Adjust as needed
     model.rotation.z = 0;             // Adjust as needed
    console.log('✅ Loaded GLB model:', model);
    // Ensure model is in the correct position
    model.position.set(0, 0, 0); // Center the model in the scene
    model.scale.set(1, 1, 1); // Scale the model if necessary
    if (model.scale.x === 0 || model.scale.y === 0 || model.scale.z === 0) {
        console.error("❌ Model scale is zero, check the GLB file.");
        return;
    }
    console.log('✅ Model scale set to:', model.scale.x, model.scale.y, model.scale.z);
    // Setup mixer and animations
    mixer = new THREE.AnimationMixer(model);

    gltf.animations.forEach((clip) => {
        let action = mixer.clipAction(clip);
        action.clampWhenFinished = true;
        action.setLoop(THREE.LoopOnce, 1);
        action.paused = true;
        action.enabled = true;
        animations.push(action);
        console.log('✅ Loaded animation:', clip.name);
    });

    model.traverse((child) => {
        if (child.isMesh) {
            child.userData.clickable = true;
        }
    });
  },
  undefined,
  function (error) {
    console.error("❌ Error loading GLB model:", error);
  }
);

// Click or touch interaction
function handleInteraction(event) {
  const touch = event.touches ? event.touches[0] : event;
  const mouse = new THREE.Vector2(
      (touch.clientX / window.innerWidth) * 2 - 1,
      -(touch.clientY / window.innerHeight) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      if (clickedObject.userData.clickable && animations.length > 0) {
          animations.forEach(action => {
              const duration = action.getClip().duration;

              action.stop(); // 🔥 Make sure it's not still running
              action.reset();
              action.setLoop(THREE.LoopOnce, 1);
              action.clampWhenFinished = true;
              action.enabled = true;

              if (animationReversed) {
                  action.timeScale = -1;
                  action.time = duration;
              } else {
                  action.timeScale = 1;
                  action.time = 0;
              }

              action.paused = false;
              action.play();

              // ⚡ Force mixer to sync new action state
              if (mixer) mixer.update(0.001); 
          });

          animationReversed = !animationReversed;
      }
  }
}



// Events
window.addEventListener('click', handleInteraction);
window.addEventListener('touchstart', handleInteraction);

// Render loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  renderer.render(scene, camera);
}
animate();