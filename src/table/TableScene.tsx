import { Canvas } from '@react-three/fiber';
import { Grid, OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { PERSONAS, type Persona } from '../ergonomics/constants';
import { sizeFromDiagonal } from '../ergonomics/engine';
import { MARBLE, MODELS, type ModelCfg } from '../scene/GltfAvatar';
import { f } from '../scene/scale';
import { makeTestPattern } from '../scene/testPattern';
import { useConfigStore } from '../store/useConfigStore';

// The horizontal table 3D stage. The screen lies FACE-UP on a tabletop at the
// surface height; the user stands at the near edge. Self-contained Canvas (each
// tab owns its own, like the placement and projection scenes). Reach posing is
// the GLB's baked forward-reach for now — good enough to read the geometry.

function Lights() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#ffffff', '#aab2bd', 1.5]} />
      <directionalLight position={[6, 14, 9]} intensity={1.4} castShadow />
      <directionalLight position={[-8, 8, 6]} intensity={0.5} />
    </>
  );
}

function Floor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#b9c0c9" />
      </mesh>
      <Grid
        args={[60, 60]}
        cellSize={1}
        cellColor="#9aa3ae"
        sectionSize={5}
        sectionColor="#6f7a87"
        infiniteGrid
        fadeDistance={48}
        position={[0, 0.002, 0]}
      />
    </>
  );
}

/** Tabletop slab + pedestal base, with the screen lying face-up on top. */
function Table({ widthFt, depthFt, topY }: { widthFt: number; depthFt: number; topY: number }) {
  const { diagonal, aspectW, aspectH } = useConfigStore();
  const pattern = useMemo(
    () => makeTestPattern(aspectW, aspectH, diagonal),
    [aspectW, aspectH, diagonal],
  );
  useEffect(() => () => pattern.dispose(), [pattern]);

  const slabThk = f(1.5);
  const overhang = f(2);
  const legH = Math.max(0.1, topY - slabThk);

  return (
    <group>
      {/* tabletop slab (top face at topY) */}
      <mesh position={[0, topY - slabThk / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthFt + overhang, slabThk, depthFt + overhang]} />
        <meshStandardMaterial color="#6b7480" />
      </mesh>
      {/* pedestal column + base — central, leaving knee room at the near edge */}
      <mesh position={[0, legH / 2, 0]} castShadow>
        <boxGeometry args={[f(8), legH, f(8)]} />
        <meshStandardMaterial color="#5a6470" />
      </mesh>
      <mesh position={[0, f(0.6), 0]} castShadow>
        <boxGeometry args={[f(22), f(1.2), f(22)]} />
        <meshStandardMaterial color="#4a525c" />
      </mesh>

      {/* black bezel just proud of the slab */}
      <mesh position={[0, topY + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[widthFt + f(1.2), depthFt + f(1.2)]} />
        <meshBasicMaterial color="#0a0c10" />
      </mesh>
      {/* active screen, face-up */}
      <mesh position={[0, topY + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[widthFt, depthFt]} />
        <meshBasicMaterial map={pattern} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** GLB figure standing at the near edge, facing the surface (−Z). */
function TableFigure({ cfg, persona, userZ }: { cfg: ModelCfg; persona: Persona; userZ: number }) {
  const { scene } = useGLTF(cfg.url);
  const prep = useMemo(() => {
    const root = skeletonClone(scene) as THREE.Object3D;
    root.traverse((o) => {
      const any = o as unknown as { isLight?: boolean; isCamera?: boolean; isMesh?: boolean };
      if (any.isLight || any.isCamera) o.visible = false;
      if (any.isMesh) {
        (o as THREE.Mesh).material = MARBLE;
        o.castShadow = true;
        (o as THREE.Mesh).frustumCulled = false;
      }
    });
    root.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
    const holder = new THREE.Group();
    holder.add(root);
    holder.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(holder);
    const size = box.getSize(new THREE.Vector3());
    return { holder, center: box.getCenter(new THREE.Vector3()), min: box.min.clone(), height: size.y };
  }, [scene, cfg.rot]);

  const scale = f(persona.statureHeight) / prep.height;
  return (
    <group position={[0, 0, userZ]} rotation={[0, cfg.faceYaw, 0]}>
      <group
        scale={scale}
        position={[-prep.center.x * scale, -prep.min.y * scale, -prep.center.z * scale]}
      >
        <primitive object={prep.holder} />
      </group>
    </group>
  );
}

class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Avatar({ userZ }: { userZ: number }) {
  const personaId = useConfigStore((s) => s.personaId);
  const cfg = MODELS[personaId];
  if (!cfg) return null;
  return (
    <ModelBoundary key={personaId}>
      <Suspense fallback={null}>
        <TableFigure cfg={cfg} persona={PERSONAS[personaId]} userZ={userZ} />
      </Suspense>
    </ModelBoundary>
  );
}

function CameraRig({ widthFt, depthFt, topY }: { widthFt: number; depthFt: number; topY: number }) {
  const dist = Math.max(widthFt, depthFt);
  return (
    <>
      <PerspectiveCamera
        makeDefault
        fov={45}
        position={[Math.max(6, widthFt) + 1.5, topY + 4.5, depthFt / 2 + dist + 6]}
      />
      <OrbitControls target={[0, topY, 0]} maxPolarAngle={Math.PI / 2} />
    </>
  );
}

export function TableScene() {
  const { diagonal, aspectW, aspectH, tableHeight } = useConfigStore();
  const size = sizeFromDiagonal(diagonal, aspectW, aspectH);
  const widthFt = f(size.width); // along x, the near edge
  const depthFt = f(size.height); // along z, reach-across
  const topY = f(tableHeight);
  // User stands just behind the near edge (near edge at +depthFt/2).
  const userZ = depthFt / 2 + f(8);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      style={{ background: 'linear-gradient(180deg,#dfe4ea 0%,#bcc4ce 55%,#9ca5b0 100%)' }}
    >
      <CameraRig widthFt={widthFt} depthFt={depthFt} topY={topY} />
      <Lights />
      <Floor />
      <Table widthFt={widthFt} depthFt={depthFt} topY={topY} />
      <Avatar userZ={userZ} />
    </Canvas>
  );
}
