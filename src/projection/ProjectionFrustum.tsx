import { Line } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { type FrustumGeometry, type Vec3 } from './projectionMath';

/**
 * The light cone from the lens to the four landed corners: a translucent solid
 * pyramid plus crisp edge lines, with a small box standing in for the projector
 * body at the apex.
 */
export function ProjectionFrustum({
  geom,
  color,
}: {
  geom: FrustumGeometry;
  color: string;
}) {
  const { lens, topLeft, topRight, bottomRight, bottomLeft } = geom;

  const solid = useMemo(() => {
    const c: Vec3[] = [lens, topLeft, topRight, bottomRight, bottomLeft];
    const positions = new Float32Array(c.flatMap((p) => p));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    // four side triangles: apex(0) to each consecutive corner pair
    geo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1]);
    geo.computeVertexNormals();
    return geo;
  }, [lens, topLeft, topRight, bottomRight, bottomLeft]);
  useEffect(() => () => solid.dispose(), [solid]);

  const edges: [Vec3, Vec3][] = [
    [lens, topLeft],
    [lens, topRight],
    [lens, bottomRight],
    [lens, bottomLeft],
  ];

  return (
    <group>
      <mesh geometry={solid}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {edges.map(([a, b], i) => (
        <Line key={i} points={[a, b]} color={color} lineWidth={1.5} transparent opacity={0.7} />
      ))}
      {/* projector body at the lens */}
      <mesh position={lens}>
        <boxGeometry args={[1.1, 0.5, 1.6]} />
        <meshStandardMaterial color="#1b2430" />
      </mesh>
    </group>
  );
}
