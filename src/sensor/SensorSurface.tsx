import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { makeCoverageTexture } from './sensorTexture';
import {
  coverageField,
  type SensorGeometry,
  type SensorParams,
  type Vec3,
} from './sensorMath';

const LIFT = 0.01; // nudge the patch just off the surface to avoid z-fighting

/** Build a quad mesh from the four landed corners, with UVs for the texture. */
function quadGeometry(g: SensorGeometry, normal: Vec3): THREE.BufferGeometry {
  const corners: Vec3[] = [g.topLeft, g.topRight, g.bottomRight, g.bottomLeft];
  const positions = new Float32Array(
    corners.flatMap((c) => [
      c[0] + normal[0] * LIFT,
      c[1] + normal[1] * LIFT,
      c[2] + normal[2] * LIFT,
    ]),
  );
  // TL(0,0) TR(1,0) BR(1,1) BL(0,1) — v=0 is the top row of the field.
  const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex([0, 3, 2, 0, 2, 1]);
  geo.computeVertexNormals();
  return geo;
}

export function SensorSurface({
  geom,
  params,
}: {
  geom: SensorGeometry;
  params: SensorParams;
}) {
  const normal: Vec3 = params.target === 'floor' ? [0, 1, 0] : [0, 0, -1];

  const geo = useMemo(() => quadGeometry(geom, normal), [geom, normal]);
  useEffect(() => () => geo.dispose(), [geo]);

  const tex = useMemo(() => {
    const field = coverageField(params, 48);
    return makeCoverageTexture(field);
  }, [params]);
  useEffect(() => () => tex.dispose(), [tex]);

  return (
    <mesh geometry={geo}>
      <meshBasicMaterial map={tex} side={THREE.DoubleSide} toneMapped={false} transparent opacity={0.92} />
    </mesh>
  );
}
