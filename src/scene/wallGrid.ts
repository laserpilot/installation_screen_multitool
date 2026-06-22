import * as THREE from 'three';

/**
 * A transparent 1-ft tile with a major line on each edge (12") and a minor
 * line through the middle (6"). Tiled across the wall it reads as a measurement
 * grid without hiding the wall colour.
 */
export function makeWallGrid(): THREE.Texture {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, S, S);

  // 6" minor lines
  ctx.strokeStyle = 'rgba(28,38,50,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(S / 2, 0);
  ctx.lineTo(S / 2, S);
  ctx.moveTo(0, S / 2);
  ctx.lineTo(S, S / 2);
  ctx.stroke();

  // 12" major lines (on the bottom/left edges so tiling is seamless)
  ctx.strokeStyle = 'rgba(18,26,36,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0.5, 0);
  ctx.lineTo(0.5, S);
  ctx.moveTo(0, S - 0.5);
  ctx.lineTo(S, S - 0.5);
  ctx.stroke();

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
