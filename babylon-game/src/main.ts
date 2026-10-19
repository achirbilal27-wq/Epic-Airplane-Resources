import {
  Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, DirectionalLight,
  Color4, Color3, MeshBuilder, StandardMaterial, TransformNode, SceneLoader,
  type AbstractMesh, type Mesh
} from '@babylonjs/core';
import '@babylonjs/loaders';
import './style.css';

type Aircraft = { id: string; name: string; file: string; cost: number; speed: number; handling: number; description: string };
type Region = { id: string; name: string; subtitle: string; emoji: string; unlockAt: number; reward: number; color: Color3 };
type SaveData = { coins: number; selectedAircraft: string; selectedRegion: string; owned: string[]; upgrades: number; missions: string[]; bestDistance: number };
const AIRCRAFT: Aircraft[] = [
  { id: 'comet', name: 'Comet Scout', file: 'dae_stylized_plane_comet_88.glb', cost: 0, speed: 1, handling: 1, description: 'Balanced explorer' },
  { id: 'haul', name: 'Cargo Runner', file: 'medium_haul_plane_low_poly.glb', cost: 180, speed: 0.88, handling: 0.78, description: 'Heavy-duty flight' },
  { id: 'ww1', name: 'Vintage Ace', file: 'stylized_ww1_plane.glb', cost: 260, speed: 0.94, handling: 1.2, description: 'Agile and precise' },
  { id: 'pc', name: 'Sky Ranger', file: 'plane_pc.glb', cost: 420, speed: 1.12, handling: 1.04, description: 'Long-range scout' },
  { id: 'overlord', name: 'Overlord X', file: 'overlordchaoss_plane_as_a.glb', cost: 900, speed: 1.32, handling: 0.92, description: 'Advanced prototype' }
];
const REGIONS: Region[] = [
  { id: 'island', name: 'Tropical Isles', subtitle: 'First expedition', emoji: '🌴', unlockAt: 0, reward: 70, color: new Color3(0.19, 0.43, 0.22) },
  { id: 'desert', name: 'Amber Desert', subtitle: 'Unlock at 1 flight', emoji: '🏜️', unlockAt: 1, reward: 110, color: new Color3(0.62, 0.37, 0.16) },
  { id: 'glacier', name: 'Frost Peaks', subtitle: 'Unlock at 3 flights', emoji: '❄️', unlockAt: 3, reward: 160, color: new Color3(0.56, 0.72, 0.79) },
  { id: 'frontier', name: 'Lost Frontier', subtitle: 'Unlock at 5 flights', emoji: '✧', unlockAt: 5, reward: 230, color: new Color3(0.31, 0.28, 0.54) }
];
const ASSET_BASE = 'https://raw.githubusercontent.com/achirbilal27-wq/Epic-Airplane-Resources/main/Assets/Models/GLB/';
const SAVE_KEY = 'epic-airplane-sky-frontier-v1';
const freshSave = (): SaveData => ({ coins: 120, selectedAircraft: 'comet', selectedRegion: 'island', owned: ['comet'], upgrades: 0, missions: [], bestDistance: 0 });
function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return freshSave();
    const data = JSON.parse(raw) as Partial<SaveData>;
    const defaults = freshSave();
    return {
      ...defaults, ...data,
      coins: Number.isFinite(data.coins) ? Math.max(0, Number(data.coins)) : defaults.coins,
      owned: Array.isArray(data.owned) ? [...new Set(['comet', ...data.owned.filter((id): id is string => typeof id === 'string' && AIRCRAFT.some(a => a.id === id))])] : defaults.owned,
      missions: Array.isArray(data.missions) ? [...new Set(data.missions.filter((id): id is string => typeof id === 'string' && REGIONS.some(r => r.id === id)))] : defaults.missions,
      upgrades: Number.isFinite(data.upgrades) ? Math.max(0, Math.min(10, Math.floor(Number(data.upgrades)))) : 0,
      bestDistance: Number.isFinite(data.bestDistance) ? Math.max(0, Number(data.bestDistance)) : 0
    };
  } catch { return freshSave(); }
}
let save = loadSave();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { showToast('Progress could not be saved on this device.'); } }

const canvas = document.querySelector<HTMLCanvasElement>('#renderCanvas');
if (!canvas) throw new Error('Game canvas was not found.');
const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, antialias: false, adaptToDeviceRatio: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.48, 0.75, 0.92, 1);
scene.fogMode = Scene.FOGMODE_EXP;
scene.fogDensity = 0.0018;
scene.fogColor = new Color3(0.48, 0.75, 0.92);
const camera = new ArcRotateCamera('chaseCamera', -Math.PI / 2, 1.12, 19, new Vector3(0, 3, 2), scene);
camera.lowerRadiusLimit = 13; camera.upperRadiusLimit = 24; camera.lowerBetaLimit = 0.75; camera.upperBetaLimit = 1.42;
camera.inputs.clear();
const hemi = new HemisphericLight('skyLight', new Vector3(0, 1, 0), scene); hemi.intensity = 0.85;
const sun = new DirectionalLight('sun', new Vector3(-0.4, -1, 0.5), scene); sun.position = new Vector3(30, 60, -20); sun.intensity = 1.15;
const material = (name: string, color: Color3, specular = 0.18) => {
  const m = new StandardMaterial(name, scene); m.diffuseColor = color; m.specularColor = new Color3(specular, specular, specular); m.specularPower = 48; return m;
};
const oceanMat = material('deepOcean', new Color3(0.035, 0.32, 0.48));
const sandMat = material('warmSand', new Color3(0.77, 0.69, 0.45));
const cloudMat = material('cloud', new Color3(0.96, 0.98, 1));
const planeMat = material('aircraftBlue', new Color3(0.06, 0.25, 0.72), 0.35);
const accentMat = material('aircraftGold', new Color3(1, 0.62, 0.12), 0.35);
const glassMat = material('cockpitGlass', new Color3(0.12, 0.72, 0.9), 0.2);
const ocean = MeshBuilder.CreateGround('ocean', { width: 1800, height: 1800, subdivisions: 16 }, scene);
ocean.position.y = -14; ocean.material = oceanMat;
const islandRoot = new TransformNode('islands', scene);
let islandMaterial = material('regionLand', REGIONS[0].color);
for (let i = 0; i < 25; i++) {
  const a = i * 2.399, radius = 55 + (i % 7) * 32, x = Math.cos(a) * radius, z = -35 - i * 44, scale = 5 + (i % 5) * 2.3;
  const land = MeshBuilder.CreateSphere('island_' + i, { diameter: 1, segments: 10 }, scene);
  land.scaling = new Vector3(scale * 1.8, 2.8 + (i % 4), scale * 1.25); land.position = new Vector3(x, -8, z); land.material = islandMaterial; land.parent = islandRoot;
  const beach = MeshBuilder.CreateSphere('shore_' + i, { diameter: 1, segments: 10 }, scene);
  beach.scaling = new Vector3(scale * 2, 1.15, scale * 1.4); beach.position = new Vector3(x, -10, z); beach.material = sandMat; beach.parent = islandRoot;
}
const desertMat = material('desertDunes', new Color3(0.82, 0.56, 0.28));
const iceMat = material('glacierIce', new Color3(0.62, 0.86, 0.96), 0.32);
const frontierMat = material('frontierCrystal', new Color3(0.22, 0.54, 0.8), 0.25);
frontierMat.emissiveColor = new Color3(0.03, 0.12, 0.2);
const desertProps: Mesh[] = [];
const glacierProps: Mesh[] = [];
const frontierProps: Mesh[] = [];
for (let i = 0; i < 9; i++) {
  const dune = MeshBuilder.CreateSphere('desertDune_' + i, { diameter: 1, segments: 8 }, scene);
  dune.scaling = new Vector3(11 + (i % 3) * 4, 1.8 + (i % 2), 7 + (i % 4) * 2);
  dune.position = new Vector3(Math.sin(i * 1.8) * 46, -7.5, -75 - i * 82);
  dune.material = desertMat; dune.parent = islandRoot; desertProps.push(dune);
  const peak = MeshBuilder.CreateCylinder('icePeak_' + i, { height: 16 + (i % 4) * 5, diameterTop: 0.2, diameterBottom: 11 + (i % 3) * 3, tessellation: 6 }, scene);
  peak.position = new Vector3(Math.cos(i * 2.1) * 42, -1, -65 - i * 76);
  peak.material = iceMat; peak.parent = islandRoot; glacierProps.push(peak);
  const tower = MeshBuilder.CreateBox('frontierTower_' + i, { width: 2.2 + (i % 3), height: 9 + (i % 4) * 3, depth: 2.2 + (i % 2) }, scene);
  tower.position = new Vector3(Math.sin(i * 2.5) * 48, -4, -70 - i * 84);
  tower.material = frontierMat; tower.parent = islandRoot; frontierProps.push(tower);
}
function setRegionVisuals(region: Region) {
  setRegionVisuals(region);
  const desert = region.id === 'desert', glacier = region.id === 'glacier', frontier = region.id === 'frontier';
  desertProps.forEach(mesh => mesh.setEnabled(desert));
  glacierProps.forEach(mesh => mesh.setEnabled(glacier));
  frontierProps.forEach(mesh => mesh.setEnabled(frontier));
  oceanMat.diffuseColor = glacier ? new Color3(0.12, 0.34, 0.48) : frontier ? new Color3(0.035, 0.12, 0.3) : new Color3(0.035, 0.32, 0.48);
  sandMat.diffuseColor = glacier ? new Color3(0.7, 0.84, 0.88) : desert ? new Color3(0.88, 0.72, 0.47) : new Color3(0.77, 0.69, 0.45);
  const sky = desert ? new Color3(0.82, 0.65, 0.48) : glacier ? new Color3(0.55, 0.75, 0.87) : frontier ? new Color3(0.13, 0.22, 0.43) : new Color3(0.48, 0.75, 0.92);
  scene.clearColor = new Color4(sky.r, sky.g, sky.b, 1);
  scene.fogColor = sky;
  scene.fogDensity = frontier ? 0.0025 : 0.0018;
}
for (let i = 0; i < 24; i++) {
  const cloud = MeshBuilder.CreateSphere('cloud_' + i, { diameter: 1, segments: 8 }, scene);
  const a = i * 2.17; cloud.position = new Vector3(Math.sin(a) * (65 + i * 5), 15 + (i % 6) * 4, -25 - i * 40);
  cloud.scaling = new Vector3(5 + i % 4, 1.8 + i % 2, 2.8 + i % 3); cloud.material = cloudMat;
}
const aircraftRoot = new TransformNode('aircraftRoot', scene);
let loadedMeshes: AbstractMesh[] = [];
let loadToken = 0;
function buildFallbackAircraft() {
  const root = new TransformNode('fallbackAircraft', scene); root.parent = aircraftRoot;
  const body = MeshBuilder.CreateCylinder('fuselage', { height: 6.2, diameterTop: 0.42, diameterBottom: 0.72, tessellation: 10 }, scene);
  body.rotation.x = Math.PI / 2; body.material = planeMat; body.parent = root;
  const nose = MeshBuilder.CreateSphere('nose', { diameter: 0.68, segments: 10 }, scene);
  nose.position.z = -3.15; nose.scaling = new Vector3(0.8, 0.8, 1.35); nose.material = accentMat; nose.parent = root;
  const wing = MeshBuilder.CreateBox('mainWing', { width: 8.2, height: 0.18, depth: 1.25 }, scene);
  wing.position.z = -0.45; wing.material = planeMat; wing.parent = root;
  const tail = MeshBuilder.CreateBox('tailWing', { width: 3, height: 0.14, depth: 0.7 }, scene);
  tail.position.z = 2.35; tail.material = accentMat; tail.parent = root;
  const fin = MeshBuilder.CreateBox('tailFin', { width: 0.16, height: 1.05, depth: 1.3 }, scene);
  fin.position.set(0, 0.48, 2.25); fin.material = accentMat; fin.parent = root;
  const cockpit = MeshBuilder.CreateSphere('cockpit', { diameter: 1, segments: 10 }, scene);
  cockpit.position.set(0, 0.38, -1.45); cockpit.scaling = new Vector3(0.58, 0.4, 1.05); cockpit.material = glassMat; cockpit.parent = root;
  for (const x of [-1.6, 1.6]) {
    const motor = MeshBuilder.CreateCylinder('engine_' + x, { height: 1.4, diameter: 0.55, tessellation: 8 }, scene);
    motor.rotation.x = Math.PI / 2; motor.position.set(x, -0.12, -0.45); motor.material = accentMat; motor.parent = root;
  }
}
async function loadAircraft(id: string) {
  const token = ++loadToken;
  for (const mesh of loadedMeshes) mesh.dispose(false, true);
  loadedMeshes = [];
  const oldFallback = scene.getTransformNodeByName('fallbackAircraft');
  oldFallback?.dispose(false, true);
  const model = AIRCRAFT.find(a => a.id === id) ?? AIRCRAFT[0];
  const status = document.getElementById('loadingText');
  if (status) status.textContent = 'Loading ' + model.name + '…';
  try {
    const result = await SceneLoader.ImportMeshAsync('', ASSET_BASE, model.file, scene, undefined, '.glb');
    if (token !== loadToken) { result.meshes.forEach(m => m.dispose(false, true)); return; }
    loadedMeshes = result.meshes;
    const root = result.meshes[0];
    if (root) {
      root.position = Vector3.Zero();
      root.rotation = new Vector3(0, Math.PI, 0);
      root.scaling = new Vector3(1, 1, 1);
      root.parent = aircraftRoot;
      const bounds = root.getHierarchyBoundingVectors(true);
      const size = bounds.max.subtract(bounds.min);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      root.scaling = new Vector3(7 / maxDim, 7 / maxDim, 7 / maxDim);
      root.position.y = 0;
    }
    result.meshes.forEach(m => { m.isPickable = false; });
  } catch (error) {
    console.warn('Could not load remote GLB model; using the local procedural aircraft.', error);
    if (token !== loadToken) return;
    buildFallbackAircraft();
    if (status) status.textContent = 'Using built-in aircraft model';
  }
}
const rings: Mesh[] = [];
for (let i = 0; i < 6; i++) {
  const ring = MeshBuilder.CreateTorus('routeRing_' + i, { diameter: 7, thickness: 0.22, tessellation: 20 }, scene);
  ring.position.set(Math.sin(i * 1.4) * 10, 4 + (i % 3) * 2, -65 - i * 65); ring.rotation.y = Math.sin(i) * 0.25; ring.material = accentMat; ring.setEnabled(false); rings.push(ring);
}

const el = <T extends HTMLElement>(id: string) => {
  const node = document.getElementById(id);
  if (!node) throw new Error('Missing UI element: ' + id);
  return node as T;
};
const homeScreen = el<HTMLElement>('homeScreen'), flightHud = el<HTMLElement>('flightHud'), loadingOverlay = el<HTMLElement>('loadingOverlay');
const aircraftGrid = el<HTMLElement>('aircraftGrid'), regionGrid = el<HTMLElement>('regionGrid');
const coinsEl = el<HTMLElement>('coins'), hudCoinsEl = el<HTMLElement>('hudCoins'), fleetCountEl = el<HTMLElement>('fleetCount');
const upgradeBtn = el<HTMLButtonElement>('upgradeBtn'), upgradeCostEl = el<HTMLElement>('upgradeCost'), upgradeDescription = el<HTMLElement>('upgradeDescription');
const startBtn = el<HTMLButtonElement>('startMission'), toast = el<HTMLElement>('toast');
const altitudeEl = el<HTMLElement>('altitude'), speedEl = el<HTMLElement>('speed'), distanceEl = el<HTMLElement>('distance');
const missionName = el<HTMLElement>('missionName'), missionRegion = el<HTMLElement>('missionRegion'), ringProgress = el<HTMLElement>('ringProgress'), ringLabel = el<HTMLElement>('ringLabel');
let inFlight = false, steer = 0, lift = 0, boosted = false, distance = 0, passed = 0, toastTimer = 0;
let pointerDown = false, lastX = 0, lastY = 0;
const keys = new Set<string>();
function showToast(message: string) { toast.textContent = message; toast.classList.add('show'); toastTimer = performance.now() + 2600; }
function unlockedRegion(region: Region) { return save.missions.length >= region.unlockAt; }
function selectedPlane() { return AIRCRAFT.find(a => a.id === save.selectedAircraft) ?? AIRCRAFT[0]; }
function selectedRegion() { return REGIONS.find(r => r.id === save.selectedRegion) ?? REGIONS[0]; }
function renderMenu() {
  coinsEl.textContent = String(save.coins); hudCoinsEl.textContent = String(save.coins);
  fleetCountEl.textContent = save.owned.length + '/' + AIRCRAFT.length;
  aircraftGrid.innerHTML = AIRCRAFT.map(a => {
    const owned = save.owned.includes(a.id), selected = save.selectedAircraft === a.id;
    return '<button class="aircraft-card' + (selected ? ' selected' : '') + (!owned ? ' locked' : '') + '" data-aircraft="' + a.id + '" aria-pressed="' + selected + '"><span class="plane-symbol">✈</span><strong>' + a.name + '</strong><small>' + (owned ? a.description : a.cost + ' ✦ to unlock') + '</small>' + (!owned ? '<span class="lock-tag">⌑</span>' : '') + '</button>';
  }).join('');
  regionGrid.innerHTML = REGIONS.map(r => {
    const selected = save.selectedRegion === r.id, unlocked = unlockedRegion(r);
    return '<button class="region-card' + (selected ? ' selected' : '') + '" data-region="' + r.id + '"' + (unlocked ? '' : ' disabled') + '><span class="region-emoji">' + r.emoji + '</span><strong>' + r.name + '</strong><small>' + (unlocked ? r.subtitle + ' · +' + r.reward + ' ✦' : r.subtitle) + '</small></button>';
  }).join('');
  el<HTMLElement>('regionProgress').textContent = save.missions.length + ' FLIGHTS COMPLETED';
  const cost = 80 * (save.upgrades + 1);
  upgradeCostEl.textContent = String(cost);
  upgradeDescription.textContent = 'Level ' + save.upgrades + '/10 · ' + (save.upgrades < 10 ? 'Improve speed and handling.' : 'Maximum tuning reached.');
  upgradeBtn.disabled = save.upgrades >= 10 || save.coins < cost;
  startBtn.disabled = !save.owned.includes(save.selectedAircraft);
}
aircraftGrid.addEventListener('click', async e => {
  const target = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-aircraft]');
  if (!target) return;
  const aircraft = AIRCRAFT.find(a => a.id === target.dataset.aircraft);
  if (!aircraft) return;
  if (!save.owned.includes(aircraft.id)) {
    if (save.coins < aircraft.cost) { showToast('Not enough Sky Coins yet. Complete flights to earn more.'); return; }
    save.coins -= aircraft.cost; save.owned.push(aircraft.id); showToast(aircraft.name + ' added to your fleet!');
  }
  save.selectedAircraft = aircraft.id; persist(); renderMenu();
  loadingOverlay.classList.remove('done'); await loadAircraft(aircraft.id); loadingOverlay.classList.add('done');
});
regionGrid.addEventListener('click', e => {
  const target = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-region]');
  if (!target) return;
  const region = REGIONS.find(r => r.id === target.dataset.region);
  if (!region || !unlockedRegion(region)) return;
  save.selectedRegion = region.id; persist(); renderMenu();
  islandMaterial.diffuseColor = region.color.clone();
});
upgradeBtn.addEventListener('click', () => {
  const cost = 80 * (save.upgrades + 1);
  if (save.upgrades >= 10 || save.coins < cost) { showToast('Earn more Sky Coins to tune your aircraft.'); return; }
  save.coins -= cost; save.upgrades++; persist(); renderMenu(); showToast('Aircraft tuned to level ' + save.upgrades + '.');
});
function startFlight() {
  inFlight = true; distance = 0; passed = 0; steer = 0; lift = 0;
  ringProgress.style.width = '0%'; ringLabel.textContent = 'ROUTE RINGS · 0/6';
  aircraftRoot.position.set(0, 3, 0);
  for (let i = 0; i < rings.length; i++) {
    rings[i].position.set(Math.sin(i * 1.4) * 10, 4 + (i % 3) * 2, -65 - i * 65); rings[i].setEnabled(true);
  }
  const region = selectedRegion();
  missionRegion.textContent = 'REGION ' + String(REGIONS.findIndex(r => r.id === region.id) + 1).padStart(2, '0');
  missionName.textContent = region.name;
  homeScreen.classList.add('hidden'); flightHud.classList.remove('hidden');
  showToast('Fly through the glowing route rings to complete the mission.');
}
function returnToHangar() {
  if (inFlight) finishFlight(false);
  inFlight = false; flightHud.classList.add('hidden'); homeScreen.classList.remove('hidden');
  aircraftRoot.position.set(0, 3, 0); camera.radius = 19; camera.setTarget(new Vector3(0, 3, 2));
  for (const ring of rings) ring.setEnabled(false);
  renderMenu();
}
function finishFlight(completed: boolean) {
  if (!inFlight) return;
  inFlight = false;
  for (const ring of rings) ring.setEnabled(false);
  if (completed) {
    const region = selectedRegion();
    const firstClear = !save.missions.includes(region.id);
    const reward = region.reward + Math.min(60, Math.floor(distance * 2)) + (firstClear ? 30 : 0);
    save.coins += reward; save.missions = [...new Set([...save.missions, region.id])]; save.bestDistance = Math.max(save.bestDistance, distance);
    persist(); renderMenu(); showToast('Mission complete! +' + reward + ' Sky Coins earned.');
  }
}
startBtn.addEventListener('click', async () => {
  loadingOverlay.classList.remove('done');
  el<HTMLElement>('loadingText').textContent = 'Loading aircraft and preparing route…';
  await loadAircraft(save.selectedAircraft);
  loadingOverlay.classList.add('done');
  startFlight();
});
el<HTMLButtonElement>('backHome').addEventListener('click', returnToHangar);
function bindHold(id: string, key: string) {
  const button = el<HTMLButtonElement>(id);
  button.addEventListener('pointerdown', e => { e.preventDefault(); keys.add(key); });
  const release = () => keys.delete(key);
  button.addEventListener('pointerup', release); button.addEventListener('pointerleave', release); button.addEventListener('pointercancel', release);
}
bindHold('leftBtn', 'a'); bindHold('rightBtn', 'd');
const boostButton = el<HTMLButtonElement>('boostBtn');
boostButton.addEventListener('pointerdown', () => { boosted = true; });
for (const event of ['pointerup', 'pointercancel', 'pointerleave']) boostButton.addEventListener(event, () => { boosted = false; });
window.addEventListener('keydown', e => { keys.add(e.key.toLowerCase()); if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault(); });
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); boosted = false; pointerDown = false; });
canvas.addEventListener('pointerdown', e => { if (!inFlight) return; pointerDown = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointerup', () => { pointerDown = false; });
canvas.addEventListener('pointercancel', () => { pointerDown = false; });
canvas.addEventListener('pointermove', e => {
  if (!pointerDown || !inFlight) return;
  steer = Math.max(-1, Math.min(1, steer + (e.clientX - lastX) * 0.009));
  lift = Math.max(-1, Math.min(1, lift - (e.clientY - lastY) * 0.009));
  lastX = e.clientX; lastY = e.clientY;
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
renderMenu();
setRegionVisuals(selectedRegion());
loadingOverlay.classList.add('done');
void loadAircraft(save.selectedAircraft).then(() => { /* initial aircraft is ready */ });

engine.runRenderLoop(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.04);
  if (inFlight) {
    const horizontal = (keys.has('a') || keys.has('arrowleft') ? -1 : 0) + (keys.has('d') || keys.has('arrowright') ? 1 : 0);
    const vertical = (keys.has('w') || keys.has('arrowup') ? 1 : 0) + (keys.has('s') || keys.has('arrowdown') ? -1 : 0);
    const plane = selectedPlane();
    const handling = plane.handling * (1 + save.upgrades * 0.035);
    steer += (horizontal - steer) * Math.min(1, dt * 3.5 * handling);
    lift += (vertical - lift) * Math.min(1, dt * 2.5 * handling);
    aircraftRoot.position.x = Math.max(-27, Math.min(27, aircraftRoot.position.x + steer * dt * 14 * handling));
    aircraftRoot.position.y = Math.max(-3, Math.min(17, aircraftRoot.position.y + lift * dt * 8));
    const speed = (boosted ? 34 : 23) * plane.speed * (1 + save.upgrades * 0.025);
    aircraftRoot.position.z -= dt * speed;
    aircraftRoot.rotation.z = -steer * 0.42; aircraftRoot.rotation.x = lift * 0.12;
    camera.setTarget(Vector3.Lerp(camera.target, new Vector3(aircraftRoot.position.x * 0.45, aircraftRoot.position.y + 1.2, aircraftRoot.position.z + 9), 0.045));
    camera.alpha = -Math.PI / 2 + steer * 0.08;
    islandRoot.position.z = Math.max(0, Math.floor(-aircraftRoot.position.z / 120) * 120) * 0.28;
    distance += dt * speed / 1000;
    for (const ring of rings) {
      if (ring.position.z > aircraftRoot.position.z + 4) { ring.position.z -= 390; }
      ring.rotation.y += dt * 0.35;
      if (Math.abs(ring.position.z - aircraftRoot.position.z) < 2.2 && Math.abs(ring.position.x - aircraftRoot.position.x) < 4 && Math.abs(ring.position.y - aircraftRoot.position.y) < 4) {
        ring.position.z -= 390; passed++; showToast('Route ring collected · ' + Math.min(passed, 6) + '/6');
        ringLabel.textContent = 'ROUTE RINGS · ' + Math.min(passed, 6) + '/6';
        ringProgress.style.width = Math.min(100, passed / 6 * 100) + '%';
        if (passed >= 6) finishFlight(true);
      }
    }
    altitudeEl.textContent = Math.round(320 + aircraftRoot.position.y * 30) + ' m';
    speedEl.textContent = Math.round((boosted ? 230 : 145) * plane.speed * (1 + save.upgrades * 0.025)) + ' km/h';
    distanceEl.textContent = distance.toFixed(1) + ' km';
    hudCoinsEl.textContent = String(save.coins);
    if (distance > 0 && Math.floor(distance * 10) % 20 === 0) { /* distance remains visible without per-frame save writes */ }
  } else {
    aircraftRoot.rotation.y += dt * 0.12;
    camera.setTarget(Vector3.Lerp(camera.target, new Vector3(0, 3, 2), 0.025));
  }
  if (performance.now() > toastTimer) toast.classList.remove('show');
  scene.render();
});
window.addEventListener('resize', () => engine.resize());
