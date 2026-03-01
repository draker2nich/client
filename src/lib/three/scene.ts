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
  // near = 0.001 prevents clipping when orbiting close to the model
  // far = 1000 ensures nothing disappears at distance
  const camera = new THREE.PerspectiveCamera(40, w / h, 0.001, 1000);
  camera.position.set(0, 0.3, 4);

  // ---- Renderer ----
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    logarithmicDepthBuffer: true, // prevents z-fighting at close range
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

  // Key light — front-right-top, warm
  const keyLight = new THREE.DirectionalLight(0xfff5ee, 1.0);
  keyLight.position.set(5, 6, 5);
  scene.add(keyLight);

  // Fill light — left side, cooler
  const fillLight = new THREE.DirectionalLight(0xeef0ff, 0.5);
  fillLight.position.set(-5, 3, 3);
  scene.add(fillLight);

  // Rim light — behind, for edge definition
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.35);
  rimLight.position.set(0, 3, -6);
  scene.add(rimLight);

  // Bottom fill — prevents underside going black
  const bottomFill = new THREE.DirectionalLight(0xffffff, 0.2);
  bottomFill.position.set(0, -4, 2);
  scene.add(bottomFill);

  // Hemisphere light — subtle sky/ground gradient
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.15);
  scene.add(hemi);

  // ---- Orbit Controls ----
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 0.5;  // allow close zoom without clipping
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
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 2.5 / maxDim;
  model.scale.setScalar(scale);

  // Recompute bounding box after scaling
  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

  // Move model so its center is at origin
  model.position.sub(scaledCenter);

  scene.add(model);
  ctx.model = model;

  // Fix all meshes on initial load — DoubleSide + frustumCulled off
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.computeVertexNormals();
      }
      mesh.frustumCulled = false;
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.side = THREE.DoubleSide;
        mesh.material.shadowSide = THREE.DoubleSide;
      } else if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => {
          if (m instanceof THREE.MeshStandardMaterial) {
            m.side = THREE.DoubleSide;
            m.shadowSide = THREE.DoubleSide;
          }
        });
      }
    }
  });

  // Aim controls at origin (model center)
  controls.target.set(0, 0, 0);
  controls.update();

  // ---- Texture update ----
  ctx.updateTexture = (canvas: HTMLCanvasElement) => {
    if (ctx.uvTexture) ctx.uvTexture.dispose();

    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    ctx.uvTexture = tex;

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Recompute normals to fix invisible faces
        if (mesh.geometry) {
          mesh.geometry.computeVertexNormals();
        }

        // Ensure both sides are rendered — fixes holes from flipped normals
        const mat = new THREE.MeshStandardMaterial({
          map: tex,
          side: THREE.DoubleSide,
          roughness: 0.75,
          metalness: 0.0,
          shadowSide: THREE.DoubleSide,
        });

        // Disable frustum culling so no parts disappear at edges
        mesh.frustumCulled = false;
        mesh.material = mat;
      }
    });
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