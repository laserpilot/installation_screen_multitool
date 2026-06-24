import * as THREE from 'three';
import { coverageRgb, type CoverageField } from './sensorMath';

/**
 * Paint a coverage field into a canvas texture in image (UV) space, using the
 * shared coverage ramp: gray off-surface, red inside the blind zone, green from
 * the near edge to the far edge of usable range. Row 0 is the top of the patch;
 * `flipY = false` keeps that aligned with UV v=0. Nearest filtering keeps the
 * blind/usable boundary crisp rather than smearing across the threshold.
 */
export function makeCoverageTexture(field: CoverageField): THREE.CanvasTexture {
  const n = field.n;
  const canvas = document.createElement('canvas');
  canvas.width = n;
  canvas.height = n;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(n, n);
  for (let i = 0; i < field.dist.length; i++) {
    const [r, g, b] = coverageRgb(
      field.dist[i],
      field.onSurface[i] === 1,
      field.minRangeFt,
      field.maxRangeFt,
    );
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
