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
 * Apply a MeshStandardMaterial with DoubleSide to every mesh in the model.
 * When a CanvasTexture is provided it is used as the `map`;
 * otherwise a plain white material is applied so nothing looks transparent.
 */
function applyMaterialToModel(
  model: THREE.Group,
  texture: THREE.CanvasTexture | null
): void {
  model.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;

    if (mesh.geometry) {
      mesh.geometry.computeVertexNormals();
    }
    mesh.frustumCulled = false;

    const mat = new THREE.MeshStandardMaterial({
      map: texture ?? undefined,
      color: texture ? undefined : 0xffffff,
      side: THREE.DoubleSide,
      roughness: 0.75,
      metalness: 0.0,
      shadowSide: THREE.DoubleSide,
    });

    mesh.material = mat;
  });
}

export async function initScene(
  container: HTMLElement,
  onModelLoaded?: () => void
): Promise<SceneContext> {
  const w = container.clientWidth;
  const h = container.clientHeight;

  // ---- Scene ----
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08080a);

  // ---- Camera ----
  const camera = new THREE.PerspectiveCamera(40, w / h, 0.001, 1000);
  camera.position.set(0, 0.3, 4);

  // ---- Renderer ----
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    logarithmicDepthBuffer: true,
  });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  // ---- Lighting — soft studio setup ----
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xfff5ee, 1.0);
  keyLight.position.set(5, 6, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xeef0ff, 0.5);
  fillLight.position.set(-5, 3, 3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.35);
  rimLight.position.set(0, 3, -6);
  scene.add(rimLight);

  const bottomFill = new THREE.DirectionalLight(0xffffff, 0.2);
  bottomFill.position.set(0, -4, 2);
  scene.add(bottomFill);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.15);
  scene.add(hemi);

  // ---- Orbit Controls ----
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 0.5;
  controls.maxDistance = 15;
  controls.maxPolarAngle = Math.PI;
  controls.minPolarAngle = 0;
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

  // Center and scale
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 2.5 / maxDim;
  model.scale.setScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
  model.position.sub(scaledCenter);

  scene.add(model);
  ctx.model = model;

  // Apply a solid white DoubleSide material immediately so nothing is transparent
  applyMaterialToModel(model, null);

  controls.target.set(0, 0, 0);
  controls.update();

  // ---- Texture update ----
  ctx.updateTexture = (canvas: HTMLCanvasElement) => {
    if (ctx.uvTexture) ctx.uvTexture.dispose();

    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    ctx.uvTexture = tex;

    applyMaterialToModel(model, tex);
  };

  onModelLoaded?.();

  // ---- Animation loop ----
  let animId: number;
  const animate = () => {
    animId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  // ---- Resize ----
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