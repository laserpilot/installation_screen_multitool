import { Text } from '@react-three/drei';
import { ADA_REACH_HIGH, ADA_REACH_LOW } from '../ergonomics/constants';
import { f } from './scale';

/** Translucent 15–48" ADA operable band painted on the wall, with labels. */
export function ReachBandOverlay({ width }: { width: number }) {
  const low = f(ADA_REACH_LOW);
  const high = f(ADA_REACH_HIGH);
  const h = high - low;
  const cy = (low + high) / 2;
  const w = f(width);

  return (
    <group>
      <mesh position={[0, cy, 0.015]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color="#19a05a" transparent opacity={0.16} />
      </mesh>
      {/* boundary lines */}
      {[low, high].map((y) => (
        <mesh key={y} position={[0, y, 0.02]}>
          <planeGeometry args={[w, 0.025]} />
          <meshBasicMaterial color="#0f7a40" transparent opacity={0.65} />
        </mesh>
      ))}
      <Text
        position={[-w / 2 - 0.4, high, 0.05]}
        fontSize={0.22}
        color="#0c6e39"
        outlineWidth={0.01}
        outlineColor="#ffffff"
        anchorX="right"
        anchorY="middle"
      >
        {`ADA 48"`}
      </Text>
      <Text
        position={[-w / 2 - 0.4, low, 0.05]}
        fontSize={0.22}
        color="#0c6e39"
        outlineWidth={0.01}
        outlineColor="#ffffff"
        anchorX="right"
        anchorY="middle"
      >
        {`ADA 15"`}
      </Text>
    </group>
  );
}
