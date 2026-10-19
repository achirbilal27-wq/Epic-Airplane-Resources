import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, DirectionalLight, Color4, Color3, MeshBuilder, StandardMaterial, DynamicTexture, TransformNode } from '@babylonjs/core';
import '@babylonjs/loaders';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#renderCanvas');
if (!canvas) throw new Error('Game canvas was not found.');

const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, antialias: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.48, 0.75, 0.92, 1);
scene.fogMode = Scene.FOGMODE_EXP;
scene.fogDensity = 0.0018;
scene.fogColor = new Color3(0.48, 0.75, 0.92);

const camera = new ArcRotateCamera('chaseCamera', -Math.PI / 2, 1.12, 19, new Vector3(0, 2, 0), scene);
camera.lowerRadiusLimit = 13;
camera.upperRadiusLimit = 24;
camera.lowerBetaLimit = 0.75;
camera.upperBetaLimit = 1.42;
camera.inputs.clear();
camera.attachControl(canvas, true);
camera.panningSensibility = 0;
camera.wheelPrecision = 100;

const hemi = new HemisphericLight('skyLight', new Vector3(0, 1, 0), scene);
hemi.intensity = 0.85;
const sun = new DirectionalLight('sun', new Vector3(-0.4, -1, 0.5), scene);
sun.position = new Vector3(30, 60, -20);
sun.intensity = 1.15;

const mat = (name: string, color: Color3, roughness = 0.8) => {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = color;
  m.specularColor = new Color3(0.18, 0.2, 0.22);
  m.specularPower = 48;
  return m;
};
const oceanMat = mat('deepOcean', new Color3(0.035, 0.32, 0.48));
const islandMat = mat('lushIsland', new Color3(0.19, 0.43, 0.22));
const sandMat = mat('warmSand', new Color3(0.77, 0.69, 0.45));
const cloudMat = mat('cloud', new Color3(0.96, 0.98, 1));
const planeMat = mat('aircraftBlue', new Color3(0.06, 0.25, 0.72), 0.35);
const accentMat = mat('aircraftGold', new Color3(1, 0.62, 0.12), 0.35);
const glassMat = mat('cockpitGlass', new Color3(0.12, 0.72, 0.9), 0.2);

const ocean = MeshBuilder.CreateGround('ocean', { width: 1800, height: 1800, subdivisions: 32 }, scene);
ocean.position.y = -14;
ocean.material = oceanMat;

const islandRoot = new TransformNode('islands', scene);
for (let i = 0; i < 28; i++) {
  const a = i * 2.399;
  const radius = 65 + (i % 7) * 34;
  const x = Math.cos(a) * radius;
  const z = -45 - i * 42;
  const scale = 5 + (i % 5) * 2.3;
  const land = MeshBuilder.CreateSphere('island_' + i, { diameter: 1, segments: 12 }, scene);
  land.scaling = new Vector3(scale * 1.8, 2.8 + (i % 4), scale * 1.25);
  land.position = new Vector3(x, -8 + (i % 3) * 0.2, z);
  land.material = islandMat;
  land.parent = islandRoot;
  const beach = MeshBuilder.CreateSphere('shore_' + i, { diameter: 1, segments: 12 }, scene);
  beach.scaling = new Vector3(scale * 2.0, 1.25, scale * 1.4);
  beach.position = new Vector3(x, -10, z);
  beach.material = sandMat;
  beach.parent = islandRoot;
  if (i % 2 === 0) {
    for (let t = 0; t < 4; t++) {
      const tree = MeshBuilder.CreateCylinder('palm_' + i + '_' + t, { height: 2.6, diameterTop: 0.12, diameterBottom: 0.3, tessellation: 5 }, scene);
      tree.position = new Vector3(x + (t - 1.5) * scale * 0.28, -5.2, z + (t % 2) * 2);
      tree.material = islandMat;
      tree.parent = islandRoot;
    }
  }
}

for (let i = 0; i < 30; i++) {
  const cloud = MeshBuilder.CreateSphere('cloud_' + i, { diameter: 1, segments: 8 }, scene);
  const angle = i * 2.17;
  cloud.position = new Vector3(Math.sin(angle) * (65 + i * 5), 15 + (i % 6) * 4, -25 - i * 36);
  cloud.scaling = new Vector3(5 + i % 4, 1.8 + i % 2, 2.8 + i % 3);
  cloud.material = cloudMat;
}

const plane = new TransformNode('playerAircraft', scene);
const body = MeshBuilder.CreateCylinder('fuselage', { height: 6.2, diameterTop: 0.42, diameterBottom: 0.72, tessellation: 12 }, scene);
body.rotation.x = Math.PI / 2;
body.material = planeMat;
body.parent = plane;
const nose = MeshBuilder.CreateSphere('nose', { diameter: 0.68, segments: 12 }, scene);
nose.position.z = -3.15; nose.scaling = new Vector3(0.8, 0.8, 1.35); nose.material = accentMat; nose.parent = plane;
const wing = MeshBuilder.CreateBox('mainWing', { width: 8.2, height: 0.18, depth: 1.25 }, scene);
wing.position.z = -0.45; wing.material = planeMat; wing.parent = plane;
const tailWing = MeshBuilder.CreateBox('tailWing', { width: 3.0, height: 0.14, depth: 0.7 }, scene);
tailWing.position.z = 2.35; tailWing.material = accentMat; tailWing.parent = plane;
const fin = MeshBuilder.CreateBox('tailFin', { width: 0.16, height: 1.05, depth: 1.3 }, scene);
fin.position.set(0, 0.48, 2.25); fin.material = accentMat; fin.parent = plane;
const cockpit = MeshBuilder.CreateSphere('cockpit', { diameter: 1, segments: 12 }, scene);
cockpit.position.set(0, 0.38, -1.45); cockpit.scaling = new Vector3(0.58, 0.4, 1.05); cockpit.material = glassMat; cockpit.parent = plane;
const engineL = MeshBuilder.CreateCylinder('engineL', { height: 1.4, diameter: 0.55, tessellation: 10 }, scene);
engineL.rotation.x = Math.PI / 2; engineL.position.set(-1.6, -0.12, -0.45); engineL.material = accentMat; engineL.parent = plane;
const engineR = engineL.clone('engineR');
if (engineR) { engineR.position.x = 1.6; engineR.parent = plane; }
plane.position.set(0, 3, 0);
camera.setTarget(new Vector3(0, 3, 2));

const rings: ReturnType<typeof MeshBuilder.CreateTorus>[] = [];
for (let i = 0; i < 6; i++) {
  const ring = MeshBuilder.CreateTorus('routeRing_' + i, { diameter: 7, thickness: 0.22, tessellation: 24 }, scene);
  ring.position.set(Math.sin(i * 1.4) * 10, 4 + (i % 3) * 2, -65 - i * 65);
  ring.rotation.y = Math.sin(i) * 0.25;
  ring.material = accentMat;
  rings.push(ring);
}

const keys = new Set<string>();
window.addEventListener('keydown', e => { keys.add(e.key.toLowerCase()); });
window.addEventListener('keyup', e => { keys.delete(e.key.toLowerCase()); });
let steer = 0, lift = 0, boosted = false, distance = 0, passed = 0;
let pointerDown = false, lastX = 0, lastY = 0;
canvas.addEventListener('pointerdown', e => { pointerDown = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointerup', () => { pointerDown = false; });
canvas.addEventListener('pointermove', e => {
  if (!pointerDown) return;
  steer = Math.max(-1, Math.min(1, steer + (e.clientX - lastX) * 0.012));
  lift = Math.max(-1, Math.min(1, lift - (e.clientY - lastY) * 0.012));
  lastX = e.clientX; lastY = e.clientY;
});
const bindHold = (id: string, key: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('pointerdown', e => { e.preventDefault(); keys.add(key); });
  const release = () => keys.delete(key);
  el.addEventListener('pointerup', release); el.addEventListener('pointerleave', release); el.addEventListener('pointercancel', release);
};
bindHold('leftBtn', 'a'); bindHold('rightBtn', 'd');
document.getElementById('boostBtn')?.addEventListener('pointerdown', () => { boosted = true; });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) document.getElementById('boostBtn')?.addEventListener(ev, () => { boosted = false; });

const altitudeEl = document.getElementById('altitude')!;
const speedEl = document.getElementById('speed')!;
const distanceEl = document.getElementById('distance')!;
const toast = document.getElementById('toast')!;
let toastTimer = 0;
const showToast = (message: string) => { toast.textContent = message; toast.classList.add('show'); toastTimer = performance.now() + 2600; };

engine.runRenderLoop(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.04);
  const horizontal = (keys.has('a') || keys.has('arrowleft') ? -1 : 0) + (keys.has('d') || keys.has('arrowright') ? 1 : 0);
  const vertical = (keys.has('w') || keys.has('arrowup') ? 1 : 0) + (keys.has('s') || keys.has('arrowdown') ? -1 : 0);
  steer += (horizontal - steer) * Math.min(1, dt * 3.5);
  lift += (vertical - lift) * Math.min(1, dt * 2.5);
  plane.position.x += steer * dt * 14;
  plane.position.y = Math.max(-3, Math.min(17, plane.position.y + lift * dt * 8));
  plane.position.z -= dt * (boosted ? 34 : 23);
  plane.rotation.z = -steer * 0.42;
  plane.rotation.x = lift * 0.12;
  camera.setTarget(Vector3.Lerp(camera.target, new Vector3(plane.position.x * 0.45, plane.position.y + 1.2, plane.position.z + 9), 0.045));
  camera.alpha = -Math.PI / 2 + steer * 0.08;
  islandRoot.position.z = Math.max(0, Math.floor(-plane.position.z / 120) * 120) * 0.28;
  distance += dt * (boosted ? 0.034 : 0.023);
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    if (ring.position.z > plane.position.z + 4) {
      ring.position.z -= 390;
      ring.position.x = Math.sin((passed + i) * 1.4) * 10;
      ring.position.y = 4 + ((passed + i) % 3) * 2;
    }
    ring.rotation.y += dt * 0.35;
    if (Math.abs(ring.position.z - plane.position.z) < 2.2 && Math.abs(ring.position.x - plane.position.x) < 4 && Math.abs(ring.position.y - plane.position.y) < 4) {
      ring.position.z -= 390; passed++; showToast('Route ring collected! ' + passed + ' / 6 · Keep exploring.');
    }
  }
  altitudeEl.textContent = Math.round(320 + plane.position.y * 30) + ' m';
  speedEl.textContent = (boosted ? 230 : 145) + ' km/h';
  distanceEl.textContent = distance.toFixed(1) + ' km';
  if (performance.now() > toastTimer) toast.classList.remove('show');
  scene.render();
});

window.addEventListener('resize', () => engine.resize());
window.addEventListener('contextmenu', e => e.preventDefault());
