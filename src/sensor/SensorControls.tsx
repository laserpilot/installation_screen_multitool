import { useConfigStore } from '../store/useConfigStore';
import { fmtLen, fromInches, toInches } from '../ui/units';
import {
  MOUNT_DEFAULTS,
  mToIn,
  SENSOR_PRESETS,
  type SensorMount,
  type SensorTarget,
} from './sensorMath';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="row">
      <span className="row-label">{label}</span>
      <span className="row-control">{children}</span>
    </label>
  );
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

const MOUNTS: { id: SensorMount; label: string }[] = [
  { id: 'ceiling', label: 'Ceiling' },
  { id: 'wall', label: 'Wall' },
  { id: 'floor', label: 'Floor' },
];

const TARGETS: { id: SensorTarget; label: string }[] = [
  { id: 'floor', label: 'Floor' },
  { id: 'wall', label: 'Facing wall' },
];

export function SensorControls() {
  const s = useConfigStore();
  const units = s.units;
  const metric = units === 'metric';

  // Range is entered in the user's big unit (ft or m); store stays in inches.
  const bigUnit = metric ? 'm' : 'ft';
  const bigVal = (inches: number) =>
    metric ? Math.round(inches * 2.54) / 100 : Math.round((inches / 12) * 100) / 100;
  const bigToIn = (v: number) => (metric ? (v * 100) / 2.54 : v * 12);

  function applyMount(mount: SensorMount) {
    const d = MOUNT_DEFAULTS[mount];
    s.set('sensorMount', mount);
    s.set('sensorMountAff', d.mountAffIn);
    s.set('sensorPitchDeg', d.pitchDeg);
    s.set('sensorTarget', d.target);
  }

  // Mount-height slider bounds in the active unit (0–24 ft).
  const heightMax = metric ? 730 : 288;
  const heightStep = metric ? 2 : 1;

  return (
    <div className="panel">
      <h2>Sensor</h2>

      <Row label="Preset">
        <select
          value=""
          onChange={(e) => {
            const p = SENSOR_PRESETS[Number(e.target.value)];
            if (!p) return;
            s.set('sensorHFov', p.hFovDeg);
            s.set('sensorVFov', p.vFovDeg);
            s.set('sensorMinRange', mToIn(p.minM));
            s.set('sensorMaxRange', mToIn(p.maxM));
          }}
        >
          <option value="">Choose…</option>
          {SENSOR_PRESETS.map((p, i) => (
            <option key={p.label} value={i}>
              {p.label} — {p.hFovDeg}°×{p.vFovDeg}°, {p.minM}–{p.maxM} m
            </option>
          ))}
        </select>
      </Row>

      <Row label="Horizontal FOV">
        <span className="num-entry">
          <input
            type="number"
            step={1}
            min={1}
            max={180}
            value={s.sensorHFov}
            onChange={(e) => s.set('sensorHFov', Number(e.target.value))}
          />
          <span className="unit">°</span>
        </span>
      </Row>

      <Row label="Vertical FOV">
        <span className="num-entry">
          <input
            type="number"
            step={1}
            min={1}
            max={180}
            value={s.sensorVFov}
            onChange={(e) => s.set('sensorVFov', Number(e.target.value))}
          />
          <span className="unit">°</span>
        </span>
      </Row>

      <Row label="Min range">
        <span className="num-entry">
          <input
            type="number"
            step={0.1}
            min={0}
            value={bigVal(s.sensorMinRange)}
            onChange={(e) => s.set('sensorMinRange', bigToIn(Number(e.target.value)))}
          />
          <span className="unit">{bigUnit}</span>
        </span>
      </Row>

      <Row label="Max range">
        <span className="num-entry">
          <input
            type="number"
            step={0.1}
            min={0}
            value={bigVal(s.sensorMaxRange)}
            onChange={(e) => s.set('sensorMaxRange', bigToIn(Number(e.target.value)))}
          />
          <span className="unit">{bigUnit}</span>
        </span>
      </Row>
      <p className="hint">
        Depth cams are blind nearer than the min and noisy past the max — coverage
        is the cone clipped to that window.
      </p>

      <h2>Mount</h2>

      <Row label="Mount">
        <span className="seg sm">
          {MOUNTS.map((m) => (
            <button
              key={m.id}
              className={s.sensorMount === m.id ? 'on' : ''}
              onClick={() => applyMount(m.id)}
            >
              {m.label}
            </button>
          ))}
        </span>
      </Row>

      <div className="field">
        <div className="field-head">
          <span className="row-label">
            {s.sensorMount === 'ceiling' ? 'Ceiling height' : 'Mount height'}
          </span>
          <span className="num-readout">{fmtLen(s.sensorMountAff, units)}</span>
        </div>
        <input
          className="slider"
          type="range"
          min={0}
          max={heightMax}
          step={heightStep}
          value={round(fromInches(s.sensorMountAff, units))}
          onChange={(e) => s.set('sensorMountAff', toInches(Number(e.target.value), units))}
        />
      </div>

      <Row label="Aim at">
        <span className="seg sm">
          {TARGETS.map((t) => (
            <button
              key={t.id}
              className={s.sensorTarget === t.id ? 'on' : ''}
              onClick={() => s.set('sensorTarget', t.id)}
            >
              {t.label}
            </button>
          ))}
        </span>
      </Row>

      {s.sensorTarget === 'wall' && (
        <div className="field">
          <div className="field-head">
            <span className="row-label">Facing-wall distance</span>
            <span className="num-readout">{fmtLen(s.sensorWallDist, units)}</span>
          </div>
          <input
            className="slider"
            type="range"
            min={metric ? 30 : 12}
            max={metric ? 1500 : 600}
            step={metric ? 5 : 2}
            value={round(fromInches(s.sensorWallDist, units))}
            onChange={(e) => s.set('sensorWallDist', toInches(Number(e.target.value), units))}
          />
        </div>
      )}

      <h2>Aim</h2>

      <div className="field">
        <div className="field-head">
          <span className="row-label">Tilt (pitch)</span>
          <span className="num-readout">{s.sensorPitchDeg}°</span>
        </div>
        <input
          className="slider"
          type="range"
          min={-90}
          max={90}
          step={1}
          value={s.sensorPitchDeg}
          onChange={(e) => s.set('sensorPitchDeg', Number(e.target.value))}
        />
        <p className="hint">0° = level · −90° = straight down · +90° = straight up.</p>
      </div>

      <div className="field">
        <div className="field-head">
          <span className="row-label">Pan (yaw)</span>
          <span className="num-readout">{s.sensorYawDeg}°</span>
        </div>
        <input
          className="slider"
          type="range"
          min={-180}
          max={180}
          step={1}
          value={s.sensorYawDeg}
          onChange={(e) => s.set('sensorYawDeg', Number(e.target.value))}
        />
      </div>

      <label className="check">
        <input
          type="checkbox"
          checked={s.sensorShowFigure}
          onChange={(e) => s.set('sensorShowFigure', e.target.checked)}
        />
        Show person for scale
      </label>
    </div>
  );
}
