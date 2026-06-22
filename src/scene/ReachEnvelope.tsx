import { Text } from '@react-three/drei';
import { useConfigStore } from '../store/useConfigStore';
import { f } from './scale';

type P = [number, number, number];

// Just in front of the screen surface (screen plane renders at world z ≈ 0.07).
const FRONT_Z = 0.12;

/**
 * Reachable zone, projected onto the wall/screen. The set of wall points the
 * person can touch from a planted stance is where their arm-reach sphere
 * (centred at the shoulder, radius = arm length) intersects the wall plane —
 * a circle centred in front of the shoulder. Showing it ON the wall reads as
 * "they can touch in here", which the floating sphere did not.
 */
export function ReachEnvelope({
  shoulder,
  hand,
  armLen,
  touches,
}: {
  shoulder: P;
  hand: P;
  armLen: number;
  touches: boolean;
}) {
  const show = useConfigStore((s) => s.showReach);
  const dist = shoulder[2]; // shoulder distance from the wall (z, feet)
  const r = Math.sqrt(Math.max(0, armLen * armLen - dist * dist));
  const canReachWall = r > 0.01;
  const cx = shoulder[0];
  const cy = shoulder[1];

  if (!show) return null;

  return (
    <group>
      {canReachWall && (
        <>
          {/* filled reachable disc, sitting just in front of the screen */}
          <mesh position={[cx, cy, FRONT_Z]}>
            <circleGeometry args={[r, 48]} />
            <meshBasicMaterial color="#2ecc71" transparent opacity={0.16} depthWrite={false} />
          </mesh>
          {/* outline */}
          <mesh position={[cx, cy, FRONT_Z + 0.005]}>
            <ringGeometry args={[r - 0.04, r, 48]} />
            <meshBasicMaterial color="#2ecc71" transparent opacity={0.55} depthWrite={false} />
          </mesh>
          <Text
            position={[cx, cy + r + 0.25, FRONT_Z]}
            fontSize={0.26}
            color="#13863f"
            outlineWidth={0.012}
            outlineColor="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            comfortable reach
          </Text>
        </>
      )}

      {/* touch point marker, just in front of the screen */}
      <mesh position={[hand[0], hand[1], FRONT_Z]}>
        <sphereGeometry args={[f(1.5), 14, 14]} />
        <meshBasicMaterial color={touches ? '#2ecc71' : '#e06c6c'} depthWrite={false} />
      </mesh>
    </group>
  );
}
