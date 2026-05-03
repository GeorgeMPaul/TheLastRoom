/**
 * engine/loader.js
 *
 * GLB load + cache + dispose. Knows nothing about levels, story, or
 * content schemas — callers pass URLs, get back gltf payloads, and
 * later call disposeLevel() before swapping levels.
 *
 * Exports:
 *   loadLevel(url, onProgress?)        → Promise<gltf>; URL-cached
 *   setupModel(scene, gltf, opts?)     → modelRoot (added to scene)
 *   disposeLevel(scene, modelRoot)     → remove + free GPU resources
 *   clearCache()                       → drop cached gltf payloads
 *
 * Notes:
 *  - Disposal is NOT optional. Three.js does not garbage-collect GPU
 *    resources; skipping dispose on level transitions will leak
 *    geometries/materials/textures and crash mobile within a few
 *    transitions.
 *  - The cache holds the raw gltf object. setupModel mutates the
 *    gltf.scene transform AND disposeLevel frees its GPU resources,
 *    so a cached gltf is single-use. disposeLevel removes the URL
 *    from the cache so the next load() returns a fresh gltf — that's
 *    enough for Steps 11-12 where each level loads at most a few
 *    times before reset. If preloading or true caching becomes
 *    desirable later, switch to SkeletonUtils.clone(gltf.scene) per
 *    revisit and drop the cache eviction.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const cache = new Map();   // url → gltf

// ─── Load ────────────────────────────────────────────────────────────
export function loadLevel(url, onProgress) {
  if (cache.has(url)) return Promise.resolve(cache.get(url));

  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        // Stash the source URL on the scene so disposeLevel can
        // evict the cache entry without the caller passing the URL.
        if (gltf?.scene) gltf.scene.userData.__sourceUrl = url;
        cache.set(url, gltf);
        resolve(gltf);
      },
      (progress) => {
        if (onProgress && progress.total > 0) {
          onProgress(progress.loaded / progress.total);
        }
      },
      reject,
    );
  });
}

// ─── Setup ───────────────────────────────────────────────────────────
/**
 * Centers and scales a freshly-loaded gltf scene, enables shadow
 * casting/receiving, and adds it to the given scene.
 *
 * @param scene   THREE.Scene
 * @param gltf    payload from loadLevel
 * @param opts.targetSize   max-dimension target in world units (default 6)
 * @param opts.groundY      y-offset after centering (default 0)
 * @returns the modelRoot (gltf.scene) — add it to your level state for disposal later
 */
export function setupModel(scene, gltf, opts = {}) {
  const { targetSize = 6, groundY = 0 } = opts;
  const modelRoot = gltf.scene;

  const box    = new THREE.Box3().setFromObject(modelRoot);
  const center = box.getCenter(new THREE.Vector3());
  const size   = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale  = targetSize / maxDim;

  modelRoot.scale.setScalar(scale);
  modelRoot.position.sub(center.multiplyScalar(scale));
  modelRoot.position.y = groundY;

  modelRoot.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow    = true;
      obj.receiveShadow = true;
    }
  });

  scene.add(modelRoot);
  return modelRoot;
}

// ─── Dispose ─────────────────────────────────────────────────────────
export function disposeLevel(scene, modelRoot) {
  if (!modelRoot) return;
  scene.remove(modelRoot);

  modelRoot.traverse((obj) => {
    if (obj.isMesh) {
      if (obj.geometry) obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (!mat) continue;
        for (const key of Object.keys(mat)) {
          const val = mat[key];
          if (val && val.isTexture) val.dispose();
        }
        mat.dispose();
      }
    }
  });

  // Evict the cache entry: a disposed gltf has freed its GPU
  // resources and its scene transform is already mutated, so the
  // next loadLevel(sameUrl) must do a real fresh load.
  const url = modelRoot.userData?.__sourceUrl;
  if (url) cache.delete(url);
}

export function clearCache() {
  cache.clear();
}
