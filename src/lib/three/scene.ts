import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  model: THREE.Group | null;
  uvTexture: THREE.CanvasTexture | null;
  dispose: () => void;
  updateTexture: (canvas: HTMLCanvasElement) => void;
}

const MODEL_PATH = "/models/tshirt.glb";

/**
 * Initialize the full Three.js scene: renderer, camera, lights,
 * orbit controls, and load the t-shirt GLB model.
 *
 * @param container - DOM element to mount the renderer into
 * @param onModelLoaded - Callback when model is ready
 * @returns SceneContext with all references for external control
 */
export async function initScene(
  container: HTMLElement,
  onModelLoaded?: () => void
): Promise<SceneContext> {
  const w = container.clientWidth;
  const h = container.clientHeight;

  // ---- Scene ----
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  // ---- Camera ----
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.set(0, 0.5, 3);

  // ---- Renderer ----
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  // ---- Lights ----
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(3, 4, 5);
  scene.add(dirLight);

  const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
  backLight.position.set(-3, 2, -3);
  scene.add(backLight);

  // ---- Orbit Controls ----
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 1.5;
  controls.maxDistance = 6;
  controls.target.set(0, 0, 0);

  // ---- Context ----
  const ctx: SceneContext = {
    scene,
    camera,
    renderer,
    controls,
    model: null,
    uvTexture: null,
    dispose: () => {},
    updateTexture: () => {},
  };

  // ---- Load GLB Model ----
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(MODEL_PATH);
  const model = gltf.scene;

  // Center and scale model
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 2.0 / maxDim;
  model.scale.setScalar(scale);
  model.position.sub(center.multiplyScalar(scale));

  scene.add(model);
  ctx.model = model;

  // ---- UV Texture update function ----
  ctx.updateTexture = (canvas: HTMLCanvasElement) => {
    if (ctx.uvTexture) {
      ctx.uvTexture.dispose();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    ctx.uvTexture = tex;

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.map = tex;
          mesh.material.needsUpdate = true;
        } else {
          // Replace with standard material for UV support
          mesh.material = new THREE.MeshStandardMaterial({
            map: tex,
            side: THREE.DoubleSide,
            roughness: 0.7,
            metalness: 0.0,
          });
        }
      }
    });
  };

  onModelLoaded?.();

  // ---- Animation Loop ----
  let animId: number;
  const animate = () => {
    animId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  // ---- Resize handler ----
  const onResize = () => {
    const nw = container.clientWidth;
    const nh = container.clientHeight;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  };
  window.addEventListener("resize", onResize);

  // ---- Dispose ----
  ctx.dispose = () => {
    window.removeEventListener("resize", onResize);
    cancelAnimationFrame(animId);
    controls.dispose();
    renderer.dispose();
    if (ctx.uvTexture) ctx.uvTexture.dispose();
    if (renderer.domElement.parentElement) {
      renderer.domElement.parentElement.removeChild(renderer.domElement);
    }
  };

  return ctx;
}