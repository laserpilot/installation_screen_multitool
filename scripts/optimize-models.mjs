// Strip the dead weight from the avatar GLBs. We override every surface to a
// marble material in the app, so the baked skin/clothing textures, materials,
// and UVs are unused — removing them (plus weld/dedup/quantize on the geometry)
// shrinks each file ~80% with zero visual change.
//
// Run:  node scripts/optimize-models.mjs
import { NodeIO } from '@gltf-transform/core';
import { KHRMeshQuantization } from '@gltf-transform/extensions';
import { dedup, prune, quantize, weld } from '@gltf-transform/functions';
import { statSync } from 'node:fs';

const FILES = ['adult', 'child', 'seated_adult'].map((n) => `public/${n}.glb`);
// Register the quantization extension so it's declared in the output — three.js
// reads KHR_mesh_quantization natively. Without this the shorts are misread.
const io = new NodeIO().registerExtensions([KHRMeshQuantization]);
const mb = (b) => (b / 1e6).toFixed(2) + 'MB';

for (const path of FILES) {
  const before = statSync(path).size;
  const doc = await io.read(path);
  const root = doc.getRoot();

  // Drop textures + materials (we re-shade to marble in code).
  root.listTextures().forEach((t) => t.dispose());
  root.listMaterials().forEach((m) => m.dispose());

  // Drop now-useless UV / vertex-colour attributes.
  root.listMeshes().forEach((mesh) =>
    mesh.listPrimitives().forEach((prim) => {
      prim.listSemantics().forEach((s) => {
        if (s.startsWith('TEXCOORD') || s.startsWith('COLOR')) prim.setAttribute(s, null);
      });
    }),
  );

  // Merge duplicate verts, drop duplicate accessors, prune orphans, quantize
  // positions/normals (KHR_mesh_quantization — supported natively by three).
  await doc.transform(weld(), dedup(), prune(), quantize());

  await io.write(path, doc);
  console.log(`${path}  ${mb(before)} -> ${mb(statSync(path).size)}`);
}
