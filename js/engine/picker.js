/**
 * engine/picker.js
 *
 * Mouse-pick engine. Owns the raycaster, the hover-cursor state, and
 * the emissive bump on the currently-hovered interactive mesh. Knows
 * nothing about clues, story, or game state — it just resolves a
 * pointer-up into "which interactive key was clicked" and forwards
 * the descriptor to a callback supplied by the caller.
 *
 * Lifted from Game.html's selectObject + click/raycast handler and
 * extended with: a content-driven interactive map (was: any named
 * mesh), a hover state (was: only on click), and an inputBlocked
 * switch so modals can freeze the picker without unmounting it.
 *
 * Exports:
 *   createPicker(camera, domElement, scene, onPick) → {
 *     setInteractiveMap(map),     // { meshName: descriptor }
 *     setRoot(modelRoot),         // narrows the raycast tree
 *     setInputBlocked(bool),
 *     dispose(),
 *   }
 *
 * onPick is invoked as onPick(meshName, descriptor) on a clean click
 * (drag distance ≤ 4px) that hits an interactive mesh. Misses do not
 * fire onPick.
 *
 * Hover behaviour:
 *   - Cursor flips to 'pointer' when over an interactive.
 *   - The hovered mesh gets an emissive overlay (its material is
 *     shallow-cloned so the source GLB material isn't mutated; the
 *     original is restored on un-hover).
 *
 * Caller is responsible for calling dispose() when tearing down the
 * picker (removes listeners, clears the hover effect).
 */

import * as THREE from 'three';

const HOVER_EMISSIVE   = 0xf5c842;
const HOVER_INTENSITY  = 0.35;
const DRAG_THRESHOLD_PX = 4;

export function createPicker(camera, domElement, scene, onPick) {
  const raycaster = new THREE.Raycaster();
  const ndc       = new THREE.Vector2();
  const downPos   = new THREE.Vector2();

  let interactiveMap = {};            // meshName → descriptor (caller-supplied)
  let raycastRoot    = scene;         // narrowed once the level GLB lands
  let inputBlocked   = false;

  let hoveredMesh   = null;
  const originalMaterials = new Map();   // uuid → original Material

  // ─── Hover helpers ────────────────────────────────────────────────
  const applyHover = (mesh) => {
    if (!mesh || !mesh.material) return;
    if (!originalMaterials.has(mesh.uuid)) {
      originalMaterials.set(mesh.uuid, mesh.material);
    }
    const overlay = originalMaterials.get(mesh.uuid).clone();
    overlay.emissive         = new THREE.Color(HOVER_EMISSIVE);
    overlay.emissiveIntensity = HOVER_INTENSITY;
    mesh.material = overlay;
  };

  const clearHover = (mesh) => {
    if (!mesh) return;
    const original = originalMaterials.get(mesh.uuid);
    if (original) {
      mesh.material = original;
      originalMaterials.delete(mesh.uuid);
    }
  };

  const setHover = (mesh) => {
    if (mesh === hoveredMesh) return;
    if (hoveredMesh) clearHover(hoveredMesh);
    hoveredMesh = mesh;
    if (hoveredMesh) applyHover(hoveredMesh);
    domElement.style.cursor = hoveredMesh ? 'pointer' : '';
  };

  // ─── Raycast helper ───────────────────────────────────────────────
  // Returns the first hit whose mesh.name is a key in interactiveMap,
  // or null. We intersect the entire raycastRoot (recursive) so
  // non-interactive meshes that occlude an interactive correctly block
  // the click — that's the "camera-and-occlusion" rule from CLAUDE.md.
  const pickInteractive = (clientX, clientY) => {
    const rect = domElement.getBoundingClientRect();
    ndc.x =  ((clientX - rect.left) / rect.width)  * 2 - 1;
    ndc.y = -((clientY - rect.top)  / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);

    const hits = raycaster.intersectObject(raycastRoot, true);
    for (const hit of hits) {
      if (hit.object && hit.object.name && interactiveMap[hit.object.name]) {
        return hit.object;
      }
      // First non-interactive hit occludes — stop walking.
      return null;
    }
    return null;
  };

  // ─── Pointer handlers ─────────────────────────────────────────────
  const onPointerDown = (e) => {
    if (inputBlocked) return;
    if (e.button !== 0) return;
    downPos.set(e.clientX, e.clientY);
  };

  const onPointerMove = (e) => {
    if (inputBlocked) { setHover(null); return; }
    const mesh = pickInteractive(e.clientX, e.clientY);
    setHover(mesh);
  };

  const onPointerUp = (e) => {
    if (inputBlocked) return;
    if (e.button !== 0) return;
    const dx = e.clientX - downPos.x;
    const dy = e.clientY - downPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) return;

    const mesh = pickInteractive(e.clientX, e.clientY);
    if (!mesh) return;
    const descriptor = interactiveMap[mesh.name];
    if (descriptor && typeof onPick === 'function') {
      onPick(mesh.name, descriptor);
    }
  };

  const onPointerLeave = () => setHover(null);

  domElement.addEventListener('pointerdown',  onPointerDown);
  domElement.addEventListener('pointermove',  onPointerMove);
  domElement.addEventListener('pointerup',    onPointerUp);
  domElement.addEventListener('pointerleave', onPointerLeave);

  // ─── Public API ───────────────────────────────────────────────────
  return {
    setInteractiveMap(map) {
      interactiveMap = map || {};
      // Hovered mesh might no longer be interactive — recompute next move.
      setHover(null);
    },
    setRoot(modelRoot) {
      raycastRoot = modelRoot || scene;
      setHover(null);
    },
    setInputBlocked(v) {
      inputBlocked = !!v;
      if (inputBlocked) setHover(null);
    },
    dispose() {
      setHover(null);
      domElement.removeEventListener('pointerdown',  onPointerDown);
      domElement.removeEventListener('pointermove',  onPointerMove);
      domElement.removeEventListener('pointerup',    onPointerUp);
      domElement.removeEventListener('pointerleave', onPointerLeave);
      domElement.style.cursor = '';
    },
  };
}
