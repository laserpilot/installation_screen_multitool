import { Line } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { type SensorGeometry, type Vec3 } from './sensorMath';

/**
 * The sensing cone from the sensor to the four landed corners: a translucent
 * pyramid plus crisp edge lines, with a small box standing in for the sensor
 * body at the apex.
 */
export function SensorFrustum({
  geom,
  color,
}: {
  geom: SensorGeometry;
  color: string;
}) {
  const { sensor, topLeft, topRight, bottomRight, bottomLeft } = geom;

  const solid = useMemo(() => {
    const c: Vec3[] = [sensor, topLeft, topRight, bottomRight, bottomLeft];
    const positions = new Float32Array(c.flatMap((p) => p));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1]);
    geo.computeVertexNormals();
    return geo;
  }, [sensor, topLeft, topRight, bottomRight, bottomLeft]);
  useEffect(() => () => solid.dispose(), [solid]);

  const edges: [Vec3, Vec3][] = [
    [sensor, topLeft],
    [sensor, topRight],
    [sensor, bottomRight],
    [sensor, bottomLeft],
  ];

  return (
    <group>
      <mesh geometry={solid}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {edges.map(([a, b], i) => (
        <Line key={i} points={[a, b]} color={color} lineWidth={1.5} transparent opacity={0.7} />
      ))}
      {/* sensor body at the apex */}
      <mesh position={sensor}>
        <boxGeometry args={[0.55, 0.35, 0.35]} />
        <meshStandardMaterial color="#11161d" />
      </mesh>
    </group>
  );
}
