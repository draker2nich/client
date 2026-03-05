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
 * Apply texture ONLY to the outer layer mesh (Image_3).
 * Inner layer (Image_0) gets a plain material without the design texture.
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

    // Identify layer by material name
    const currentMat = mesh.material as THREE.MeshStandardMaterial;
    const matName = currentMat?.name || "";
    const isOuter = matName === "MainFabric_Outer";
    const isInner = matName === "MainFabric_Inner";

    if (isOuter && texture) {
      // Outer layer — apply the design texture
      mesh.material = new THREE.MeshStandardMaterial({
        name: "MainFabric_Outer",
        map: texture,
        side: THREE.FrontSide,
        roughness: 0.75,
        metalness: 0.0,
      });
    } else if (isInner) {
      // Inner layer — always plain white, no design
      mesh.material = new THREE.MeshStandardMaterial({
        name: "MainFabric_Inner",
        color: 0xffffff,
        side: THREE.FrontSide,
        roughness: 0.75,
        metalness: 0.0,
      });
    } else {
      // Any other mesh or outer without texture yet
      mesh.material = new THREE.MeshStandardMaterial({
        name: matName,
        color: 0xffffff,
        side: THREE.FrontSide,
        roughness: 0.75,
        metalness: 0.0,
      });
    }
  });
}

export async function initScene(
  container: HTMLElement,
  onModelLoaded?: () => void
): Promise<SceneContext> {
  const w = container.clientWidth;
  const h = container.clientHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08080a);

  const camera = new THREE.PerspectiveCamera(40, w / h, 0.001, 1000);
  camera.position.set(0, 0.3, 4);

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

  // Lighting — soft studio setup
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

  // Orbit Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 0.5;
  controls.maxDistance = 15;
  controls.maxPolarAngle = Math.PI;
  controls.minPolarAngle = 0;
  controls.target.set(0, 0, 0);

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

  // Load GLB Model
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

  // Default: plain white material on all meshes, no texture
  applyMaterialToModel(model, null);

  controls.target.set(0, 0, 0);
  controls.update();

  // Texture update — only targets Image_3 (outer layer)
  ctx.updateTexture = (canvas: HTMLCanvasElement) => {
    if (ctx.uvTexture) ctx.uvTexture.dispose();

    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    ctx.uvTexture = tex;

    applyMaterialToModel(model, tex);
  };

  onModelLoaded?.();

  // Animation loop
  let animId: number;
  const animate = () => {
    animId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  // Resize
  const onResize = () => {
    const nw = container.clientWidth;
    const nh = container.clientHeight;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  };
  window.addEventListener("resize", onResize);

  // Dispose
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