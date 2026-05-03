/**
 * engine/scene.js
 *
 * Owns the renderer, scene, camera, lights, fog, and the time-of-day
 * (TOD) preset table. Knows nothing about levels, story, or content.
 *
 * Exports:
 *   initScene(container)        create renderer + scene + camera + lights, mount canvas in `container`
 *   applyTOD(name)              snap lighting to one of the named presets
 *   applyTODSlider(value0to100) blend continuously across dawn → day → dusk → night
 *   onResize()                  manual resize trigger; one is also wired automatically
 *   { renderer, scene, camera, ambientLight, sunLight, fillLight, rimLight }
 *
 * Lifted from the working prototype in Game.html and stripped of UI concerns.
 */

import * as THREE from 'three';

// ─── Module-scoped singletons (populated by initScene) ──────────────
export let renderer     = null;
export let scene        = null;
export let camera       = null;
export let ambientLight = null;
export let sunLight     = null;
export let fillLight    = null;
export let rimLight     = null;

let container = null;

const W = () => window.innerWidth;
const H = () => window.innerHeight;

// ─── Time-of-day presets ────────────────────────────────────────────
export const TOD = {
  dawn:  { bg:'#1a0d20', fog:0x2a1030, ambient:[0xffb87a,0.55], sun:[0xff8c5a,1.1], sunPos:[6,3,8],   fill:[0x6633aa,0.3], rim:[0xff6633,0.9], exposure:0.95 },
  day:   { bg:'#0a1830', fog:0x0a1830, ambient:[0xfff0d0,0.6],  sun:[0xffeebb,2.0], sunPos:[8,14,6],  fill:[0x8aaeff,0.5], rim:[0xff9966,0.5], exposure:1.1  },
  dusk:  { bg:'#1a0808', fog:0x200808, ambient:[0xff7030,0.5],  sun:[0xff4400,1.0], sunPos:[10,2,4],  fill:[0x330033,0.3], rim:[0xff3300,1.2], exposure:0.85 },
  // Indoor dusk: same time-of-day as `dusk` but lit from inside.
  // Red sky directional dialed way down, warm tungsten ambient lifts
  // the room to readable, and the point "rim" stands in for the
  // apartment's practical lamps — it's the dominant light source.
  'dusk-interior': { bg:'#290e13', fog:0x1a0a08, ambient:[0xffc88a,0.65], sun:[0xff6a3a,0.7], sunPos:[10,2,4], fill:[0x2a1a2a,0.2], rim:[0xffb070,2.2], exposure:1.0 },
  night: { bg:'#020408', fog:0x020408, ambient:[0x101830,0.3],  sun:[0x2030ff,0.1], sunPos:[8,14,6],  fill:[0x0a0a2a,0.1], rim:[0x3355ff,0.8], exposure:1.0  }
};

const TOD_ORDER = ['dawn', 'day', 'dusk', 'night'];

// ─── Setup ──────────────────────────────────────────────────────────
export function initScene(canvasContainer) {
  container = canvasContainer;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0e1a, 0.04);

  camera = new THREE.PerspectiveCamera(45, W() / H(), 0.1, 200);
  camera.position.set(8, 8, 8);
  camera.lookAt(0, 0, 0);

  ambientLight = new THREE.AmbientLight(0xffffff, 0.4);

  sunLight = new THREE.DirectionalLight(0xfff5e0, 1.8);
  sunLight.position.set(8, 14, 6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 0.1;
  sunLight.shadow.camera.far  = 60;
  sunLight.shadow.camera.left   = sunLight.shadow.camera.bottom = -12;
  sunLight.shadow.camera.right  = sunLight.shadow.camera.top    =  12;
  sunLight.shadow.bias = -0.001;

  fillLight = new THREE.DirectionalLight(0x8aaeff, 0.5);
  fillLight.position.set(-6, 4, -4);

  rimLight = new THREE.PointLight(0xff9966, 0.6, 30);
  rimLight.position.set(-4, 8, -4);

  scene.add(ambientLight, sunLight, fillLight, rimLight);

  window.addEventListener('resize', onResize);
}

// ─── TOD application ────────────────────────────────────────────────
export function applyTOD(name) {
  const t = TOD[name];
  if (!t) { console.warn(`[scene] unknown TOD: ${name}`); return; }
  if (container) container.style.background = t.bg;
  ambientLight.color.set(t.ambient[0]); ambientLight.intensity = t.ambient[1];
  sunLight.color.set(t.sun[0]);         sunLight.intensity     = t.sun[1];
  sunLight.position.set(...t.sunPos);
  fillLight.color.set(t.fill[0]);       fillLight.intensity    = t.fill[1];
  rimLight.color.set(t.rim[0]);         rimLight.intensity     = t.rim[1];
  renderer.toneMappingExposure = t.exposure;
  scene.fog.color.set(t.fog);
}

export function applyTODSlider(value0to100) {
  const idx = (value0to100 / 100) * (TOD_ORDER.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, TOD_ORDER.length - 1);
  const t  = idx - lo;
  const A  = TOD[TOD_ORDER[lo]];
  const B  = TOD[TOD_ORDER[hi]];

  const lerp    = (a, b, k) => a + (b - a) * k;
  const lerpCol = (ca, cb, k) => {
    const a = new THREE.Color(ca), b = new THREE.Color(cb);
    return new THREE.Color(lerp(a.r, b.r, k), lerp(a.g, b.g, k), lerp(a.b, b.b, k));
  };

  ambientLight.color.copy(lerpCol(A.ambient[0], B.ambient[0], t));
  ambientLight.intensity = lerp(A.ambient[1], B.ambient[1], t);
  sunLight.color.copy(lerpCol(A.sun[0], B.sun[0], t));
  sunLight.intensity = lerp(A.sun[1], B.sun[1], t);
  sunLight.position.set(
    lerp(A.sunPos[0], B.sunPos[0], t),
    lerp(A.sunPos[1], B.sunPos[1], t),
    lerp(A.sunPos[2], B.sunPos[2], t),
  );
  fillLight.color.copy(lerpCol(A.fill[0], B.fill[0], t));
  fillLight.intensity = lerp(A.fill[1], B.fill[1], t);
  rimLight.color.copy(lerpCol(A.rim[0], B.rim[0], t));
  rimLight.intensity = lerp(A.rim[1], B.rim[1], t);
  renderer.toneMappingExposure = lerp(A.exposure, B.exposure, t);
}

// ─── Resize ─────────────────────────────────────────────────────────
export function onResize() {
  camera.aspect = W() / H();
  camera.updateProjectionMatrix();
  renderer.setSize(W(), H());
}
