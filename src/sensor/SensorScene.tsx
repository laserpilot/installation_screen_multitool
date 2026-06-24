import { Canvas } from '@react-three/fiber';
import { Grid, Line, OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import { useMemo } from 'react';
import { useConfigStore } from '../store/useConfigStore';
import { fmtDist } from '../ui/units';
import { ProjectionFigure } from '../projection/ProjectionFigure';
import { SensorFrustum } from './SensorFrustum';
import { SensorSurface } from './SensorSurface';
import {
  BAND_LABEL,
  BAND_TONE,
  coverageColor,
  ftFromIn,
  inFromFt,
  rampGradientCss,
  sensorGeometry,
  sensorMetrics,
  type SensorParams,
} from './sensorMath';

const LINE = '#10202e';

function Lights() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#ffffff', '#aab2bd', 1.5]} />
      <directionalLight position={[6, 14, 9]} intensity={1.2} />
      <directionalLight position={[-8, 8, 6]} intensity={0.5} />
    </>
  );
}

function Floor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color="#b9c0c9" />
      </mesh>
      <Grid
        args={[120, 120]}
        cellSize={1}
        cellColor="#9aa3ae"
        sectionSize={5}
        sectionColor="#6f7a87"
        infiniteGrid
        fadeDistance={80}
        position={[0, 0.002, 0]}
      />
    </>
  );
}

/** Faint vertical wall plane the sensor is mounted on (z=0) or aimed at. */
function WallPlane({ z, height }: { z: number; height: number }) {
  return (
    <mesh position={[0, height / 2, z]}>
      <planeGeometry args={[60, height]} />
      <meshStandardMaterial
        color="#8d96a2"
        transparent
        opacity={0.35}
        side={2}
      />
    </mesh>
  );
}

function avg4(a: number, b: number, c: number, d: number) {
  return (a + b + c + d) / 4;
}

export function SensorScene() {
  const s = useConfigStore();
  const units = s.units;

  const params: SensorParams = useMemo(
    () => ({
      mount: s.sensorMount,
      mountAffIn: s.sensorMountAff,
      pitchDeg: s.sensorPitchDeg,
      yawDeg: s.sensorYawDeg,
      hFovDeg: s.sensorHFov,
      vFovDeg: s.sensorVFov,
      minRangeIn: s.sensorMinRange,
      maxRangeIn: s.sensorMaxRange,
      target: s.sensorTarget,
      wallDistIn: s.sensorWallDist,
    }),
    [
      s.sensorMount,
      s.sensorMountAff,
      s.sensorPitchDeg,
      s.sensorYawDeg,
      s.sensorHFov,
      s.sensorVFov,
      s.sensorMinRange,
      s.sensorMaxRange,
      s.sensorTarget,
      s.sensorWallDist,
    ],
  );

  const geom = useMemo(() => sensorGeometry(params), [params]);
  const metrics = useMemo(() => sensorMetrics(params), [params]);
  const tone = BAND_TONE[metrics.band];
  const bandColor = coverageColor(metrics.nearFt, true, ftFromIn(params.minRangeIn), ftFromIn(params.maxRangeIn));

  const sensorY = ftFromIn(params.mountAffIn);
  const cx = avg4(geom.topLeft[0], geom.topRight[0], geom.bottomRight[0], geom.bottomLeft[0]);
  const cz = avg4(geom.topLeft[2], geom.topRight[2], geom.bottomRight[2], geom.bottomLeft[2]);
  const cy = avg4(geom.topLeft[1], geom.topRight[1], geom.bottomRight[1], geom.bottomLeft[1]);

  // Camera framing scaled to the setup.
  const sizeFt = Math.max(metrics.spanW, metrics.spanD, sensorY, 8);
  const camX = -(sizeFt * 0.95 + 4);
  const camY = Math.max(sensorY + 4, sizeFt * 0.85);
  const camZ = Math.max(cz, 0) + sizeFt * 1.05 + 6;
  const target: [number, number, number] = [cx * 0.5, Math.max(2, sensorY * 0.4), cz * 0.5 + 1];

  // Footprint figure sits at the patch centre on the floor (scale reference).
  const showFigure = s.sensorShowFigure && params.target === 'floor' && metrics.reachesSurface;

  const fmtArea = (sqft: number) =>
    units === 'metric'
      ? `${(sqft * 0.092903).toFixed(1)} m²`
      : `${Math.round(sqft)} ft²`;

  return (
    <div className="proj-stage">
      <div className="proj-frame">
        <Canvas
          dpr={[1, 2]}
          style={{
            background: 'linear-gradient(180deg,#dfe4ea 0%,#bcc4ce 55%,#9ca5b0 100%)',
          }}
        >
          <PerspectiveCamera makeDefault fov={45} position={[camX, camY, camZ]} />
          <OrbitControls target={target} maxPolarAngle={Math.PI / 2} />
          <Lights />
          <Floor />
          {/* mount wall behind ceiling/wall sensors; facing wall for the target */}
          {params.mount !== 'floor' && <WallPlane z={-0.02} height={Math.max(sensorY + 2, 10)} />}
          {params.target === 'wall' && (
            <WallPlane z={ftFromIn(params.wallDistIn)} height={Math.max(metrics.spanD + 2, 10)} />
          )}

          <SensorSurface geom={geom} params={params} />
          <SensorFrustum geom={geom} color={bandColor} />
          {showFigure && <ProjectionFigure pos={[cx, cz]} />}

          {/* mount-height dimension up the back wall */}
          {params.mount !== 'floor' && (
            <>
              <Line
                points={[
                  [-sizeFt * 0.6, 0, 0.02],
                  [-sizeFt * 0.6, sensorY, 0.02],
                ]}
                color={LINE}
                lineWidth={2}
              />
              <Text
                position={[-sizeFt * 0.6 - 0.5, sensorY / 2, 0.06]}
                rotation={[0, 0, Math.PI / 2]}
                fontSize={0.32}
                color={LINE}
                outlineWidth={0.014}
                outlineColor="#ffffff"
                anchorX="center"
                anchorY="middle"
              >
                {fmtDist(params.mountAffIn, units)} mount
              </Text>
            </>
          )}

          {/* covered band: near → far distance label at the patch centre */}
          {metrics.reachesSurface && (
            <Text
              position={[cx, cy + 0.1, cz]}
              rotation={params.target === 'floor' ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}
              fontSize={0.4}
              color={LINE}
              outlineWidth={0.016}
              outlineColor="#ffffff"
              anchorX="center"
              anchorY="middle"
            >
              {fmtDist(inFromFt(metrics.spanW), units)} × {fmtDist(inFromFt(metrics.spanD), units)}
            </Text>
          )}
        </Canvas>
      </div>

      <div className="proj-readout">
        <div className="proj-top">
          <div className={`dvled-verdict ${tone}`}>
            <span className="dvled-dot" />
            {BAND_LABEL[metrics.band]}
            <span className="dvled-sub">
              {Math.round(metrics.fracOnSurface * 100)}% of the view lands on the{' '}
              {params.target} in range
            </span>
          </div>
          <div className="proj-legend">
            <div className="proj-legend-bar" style={{ background: rampGradientCss() }} />
            <div className="proj-legend-ticks">
              <span>near {fmtDist(params.minRangeIn, units)}</span>
              <span>far {fmtDist(params.maxRangeIn, units)}</span>
            </div>
            <div className="proj-legend-caption">
              Usable depth — near → far. Red = too close (blind), gray = out of range / off-surface.
            </div>
          </div>
        </div>

        <dl className="dvled-metrics">
          <div>
            <dt>Footprint</dt>
            <dd>
              {metrics.reachesSurface
                ? `${fmtDist(inFromFt(metrics.spanW), units)} × ${fmtDist(inFromFt(metrics.spanD), units)}`
                : '—'}
            </dd>
          </div>
          <div>
            <dt>Covered area</dt>
            <dd>{metrics.reachesSurface ? fmtArea(metrics.areaSqFt) : '—'}</dd>
          </div>
          <div>
            <dt>Covered band</dt>
            <dd>
              {metrics.reachesSurface
                ? `${fmtDist(inFromFt(metrics.nearFt), units)} – ${fmtDist(inFromFt(metrics.farFt), units)}`
                : 'out of range'}
            </dd>
          </div>
          <div>
            <dt>In-range coverage</dt>
            <dd>{Math.round(metrics.fracOnSurface * 100)}%</dd>
          </div>
          <div>
            <dt>Field of view</dt>
            <dd>
              {Math.round(params.hFovDeg)}° × {Math.round(params.vFovDeg)}°
            </dd>
          </div>
          <div>
            <dt>Usable range</dt>
            <dd>
              {fmtDist(params.minRangeIn, units)} – {fmtDist(params.maxRangeIn, units)}
            </dd>
          </div>
        </dl>
        <p className="dvled-note">
          {params.mount === 'ceiling'
            ? 'Overhead'
            : params.mount === 'wall'
              ? 'Wall'
              : 'Floor'}{' '}
          mount, aimed at the {params.target}. Footprint is the sensing cone clipped
          to usable depth — the part that floats off the {params.target} is beyond
          max range. Tilt and pan to chase coverage; raise the mount to widen it.
        </p>
      </div>
    </div>
  );
}
