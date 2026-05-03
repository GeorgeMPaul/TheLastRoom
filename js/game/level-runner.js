/**
 * game/level-runner.js
 *
 * Drives one level's lifecycle: read its content file, configure the
 * scene/lighting/camera/picker for it, load the GLB, build the picker's
 * interactive map, and warn the modeler about any content key that
 * doesn't resolve to a named object in the scene graph.
 *
 * The runner is the only place that knows BOTH the engine layer
 * (loader, picker, scene presets) AND the content layer. It deliberately
 * does NOT know about UI — clue panels, question panels, transitions
 * are mounted in main.js by subscribing to game/state.js.
 *
 * Step 7 scope: load + configure ONE level. Disposal + cross-level
 * transitions arrive in Step 12.
 *
 * Exports:
 *   loadLevelById({ levelContent, scene, picker, applyTOD, loadLevel,
 *                   setupModel })
 *     → Promise<{ modelRoot, levelContent }>
 *
 * The function takes its engine collaborators as parameters rather than
 * importing them directly so the dependency direction stays
 *   game ← engine
 * and so testing/dev-overlay can swap in a stub loader later.
 */

/**
 * @param opts.levelContent  parsed module from content/levels/level-NN.js
 * @param opts.scene         THREE.Scene
 * @param opts.picker        return value of createPicker(...)
 * @param opts.applyTOD      from engine/scene.js
 * @param opts.loadLevel     from engine/loader.js
 * @param opts.setupModel    from engine/loader.js
 */
export function loadLevelById(opts) {
  const { levelContent, scene, picker, applyTOD, loadLevel, setupModel } = opts;
  if (!levelContent) return Promise.reject(new Error('level-runner: levelContent is required'));

  // ─── Lighting (camera state seeded by main.js for now) ───────────
  const todName = levelContent.lighting?.tod ?? 'day';
  applyTOD(todName);

  // ─── Picker map (driven entirely by content) ─────────────────────
  // Translate { meshName: { label, clueId, reveal } } into the shape
  // picker.setInteractiveMap expects, which is the same shape — the
  // picker is intentionally agnostic about descriptor contents.
  picker.setInteractiveMap(levelContent.interactives || {});

  // ─── Load + setup GLB ────────────────────────────────────────────
  return loadLevel(levelContent.model).then((gltf) => {
    const modelRoot = setupModel(scene, gltf);
    picker.setRoot(modelRoot);

    warnMissingInteractives(modelRoot, levelContent);

    return { modelRoot, levelContent };
  });
}

/**
 * Walk the loaded scene graph and check that every interactive key in
 * the content file matches a named object somewhere in the tree.
 *
 * GLTF parks human-readable names on parent Groups, not the renderable
 * mesh, so we collect ANY named object — not `obj.isMesh && obj.name`.
 * The picker resolves a hit by walking up to the first interactive
 * ancestor, so the allowlist must match the same set of names we check
 * here, otherwise a "missing" warning will fire for a clue that the
 * picker would actually resolve.
 */
function warnMissingInteractives(modelRoot, levelContent) {
  const present = new Set();
  modelRoot.traverse((obj) => { if (obj.name) present.add(obj.name); });

  const missing = [];
  for (const name of Object.keys(levelContent.interactives || {})) {
    if (!present.has(name)) missing.push(name);
  }

  if (missing.length > 0) {
    console.warn(
      `[level-runner] ${levelContent.id}: ${missing.length} interactive(s) ` +
      `defined in content but not present in GLB:\n  ` + missing.join('\n  ') +
      `\n  (these clues won't be clickable until the modeler ships matching meshes)`,
    );
  }
}
