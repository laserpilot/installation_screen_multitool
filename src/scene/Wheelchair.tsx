import { f } from './scale';

/** Simple wheelchair (seat + back + two wheels) at avatar position z, seat height seatIn. */
export function Wheelchair({ z, seatIn = 19 }: { z: number; seatIn?: number }) {
  return (
    <group>
      <mesh position={[0, f(seatIn - 2), z + f(1)]}>
        <boxGeometry args={[f(20), f(2), f(20)]} />
        <meshStandardMaterial color="#2b3440" />
      </mesh>
      <mesh position={[0, f(seatIn + 9), z + f(10)]}>
        <boxGeometry args={[f(20), f(22), f(2)]} />
        <meshStandardMaterial color="#2b3440" />
      </mesh>
      {[-f(11), f(11)].map((x) => (
        <mesh key={x} position={[x, f(11), z + f(2)]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[f(11), f(1), 10, 24]} />
          <meshStandardMaterial color="#1a2026" />
        </mesh>
      ))}
    </group>
  );
}
