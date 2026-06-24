import { useGLTF } from '@react-three/drei';
import { Component, Suspense, useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { PERSONAS, type Persona } from '../ergonomics/constants';
import { MARBLE, MODELS, type ModelCfg } from '../scene/GltfAvatar';
import { f } from '../scene/scale';

/** A standing GLB figure dropped beside the image purely for size reference. */
function Figure({
  cfg,
  persona,
  pos,
}: {
  cfg: ModelCfg;
  persona: Persona;
  pos: [number, number];
}) {
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
    <group position={[pos[0], 0, pos[1]]} rotation={[0, cfg.faceYaw, 0]}>
      <group
        scale={scale}
        position={[-prep.center.x * scale, -prep.min.y * scale, -prep.center.z * scale]}
      >
        <primitive object={prep.holder} />
      </group>
    </group>
  );
}

/** Swallow a model load/parse failure so the rest of the scene survives. */
class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** To-scale adult standing off to the side of the image, facing the wall. */
export function ProjectionFigure({ pos }: { pos: [number, number] }) {
  const cfg = MODELS.adult;
  if (!cfg) return null;
  return (
    <ModelBoundary>
      <Suspense fallback={null}>
        <Figure cfg={cfg} persona={PERSONAS.adult} pos={pos} />
      </Suspense>
    </ModelBoundary>
  );
}
