import * as THREE from 'three';
import { fcToRgb, type IlluminanceField } from './projectionMath';

/**
 * Paint an illuminance field into a canvas texture in image (UV) space, using
 * the shared fc→colour ramp. Sampled with linear filtering so the per-cell
 * grid reads as a smooth gradient on the surface. Row 0 of the field is the top
 * of the image; `flipY = false` keeps that aligned with UV v=0.
 */
export function makeHeatmapTexture(field: IlluminanceField): THREE.CanvasTexture {
  const n = field.n;
  const canvas = document.createElement('canvas');
  canvas.width = n;
  canvas.height = n;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(n, n);
  for (let i = 0; i < field.data.length; i++) {
    const [r, g, b] = fcToRgb(field.data[i]);
    img.data[i * 4 + 0] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
