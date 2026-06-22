import { useRef } from 'react';
import { PERSONAS } from '../ergonomics/constants';
import { sizeFromDiagonal } from '../ergonomics/engine';
import { useConfigStore } from '../store/useConfigStore';
import { fmtDist, fmtLen } from '../ui/units';

const DARK = '#1d2733';
const ACCENT = '#2f6df0';
const EYE = '#c77d11';
const GREEN = '#19a05a';
const BODY = '#3f4a57';
const SKIN = '#d9b08c';

/**
 * 2D side elevation (the classic AV mounting drawing): wall on the left, floor
 * along the bottom, the screen edge-on at its mount height, and the viewer in
 * profile reaching toward it. All geometry is drawn in INCHES inside the SVG
 * viewBox; the engine + store drive every number, so it stays in sync with 3D.
 */
export function SideElevation() {
  const s = useConfigStore();
  const persona = PERSONAS[s.personaId];
  const size = sizeFromDiagonal(s.diagonal, s.aspectW, s.aspectH);
  const units = s.units;
  const svgRef = useRef<SVGSVGElement>(null);

  const distance = s.mode === 'touch' ? persona.touchDistance : s.viewingDistance;
  const mountBottom = s.mountBottom;
  const screenTop = mountBottom + size.height;

  const eyeH = persona.eyeHeight;
  const shoulderH = persona.shoulderHeight;
  const hipH = persona.seated ? 19 : 0.52 * persona.statureHeight;
  const armLen = 0.42 * persona.statureHeight;

  // touch target + reach (mirrors avatarLayout)
  const lo = Math.max(mountBottom, persona.reachLow);
  const hi = Math.min(screenTop, persona.reachHigh);
  const targetY = lo <= hi ? (lo + hi) / 2 : persona.reachHigh;
  const reachLen = Math.hypot(distance, shoulderH - targetY);
  const t = Math.min(1, armLen / reachLen);
  const handDepth = distance * (1 - t);
  const handHeight = shoulderH + (targetY - shoulderH) * t;
  const touches = reachLen <= armLen;
  const v = s.getVerdict();

  // viewBox layout (inches)
  const mL = 30;
  const mR = 16;
  const mT = 14;
  const mB = 30;
  const Hc = Math.max(screenTop, eyeH + 6, persona.statureHeight, 84) + 4;
  const Dc = distance + 30;
  const VBW = mL + Dc + mR;
  const VBH = mT + Hc + mB;
  const wallX = mL;
  const groundY = mT + Hc;
  const X = (depth: number) => wallX + depth;
  const Y = (h: number) => groundY - h;

  const px = X(distance); // person depth
  const sw = { major: 0.7, thin: 0.35, hair: 0.18 };
  const FS = 4.6;

  function exportSvg() {
    const el = svgRef.current;
    if (!el) return;
    const xml = new XMLSerializer().serializeToString(el);
    const blob = new Blob([xml], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screen-elevation-${Math.round(s.diagonal)}in.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const gridLines = [];
  for (let h = 12; h < Hc; h += 12) gridLines.push(h);

  return (
    <div className="twod-wrap">
      <button className="export-btn" onClick={exportSvg}>
        ⤓ Export SVG
      </button>
      <svg
        ref={svgRef}
        className="elevation"
        viewBox={`0 0 ${VBW} ${VBH}`}
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x={0} y={0} width={VBW} height={VBH} fill="#eef1f5" />

        {/* 12" height gridlines */}
        {gridLines.map((h) => (
          <line
            key={h}
            x1={wallX}
            y1={Y(h)}
            x2={wallX + Dc}
            y2={Y(h)}
            stroke="#c4ccd5"
            strokeWidth={sw.hair}
          />
        ))}

        {/* ADA reach band */}
        <rect x={wallX} y={Y(48)} width={Dc} height={48 - 15} fill={GREEN} opacity={0.12} />
        {[15, 48].map((h) => (
          <line
            key={h}
            x1={wallX}
            y1={Y(h)}
            x2={wallX + Dc}
            y2={Y(h)}
            stroke={GREEN}
            strokeWidth={sw.thin}
            strokeDasharray="2 1.5"
            opacity={0.7}
          />
        ))}
        <text x={wallX + Dc - 1} y={Y(48) - 1.5} fontSize={FS * 0.8} fill={GREEN} textAnchor="end">
          ADA reach 15–48"
        </text>

        {/* floor + wall */}
        <line x1={0} y1={groundY} x2={VBW} y2={groundY} stroke={DARK} strokeWidth={sw.major} />
        <line x1={wallX} y1={groundY} x2={wallX} y2={Y(Hc)} stroke={DARK} strokeWidth={sw.major} />

        {/* screen, edge-on, mounted on the wall */}
        <rect x={wallX} y={Y(screenTop)} width={2.4} height={size.height} fill={ACCENT} />
        <text
          x={wallX + 9}
          y={Y(screenTop) - 2}
          fontSize={FS}
          fill={ACCENT}
          style={haloStyle}
        >
          {`${Math.round(s.diagonal)}" screen`}
        </text>
        {/* screen-height dimension, glued to the screen */}
        <g stroke={ACCENT} strokeWidth={sw.thin}>
          <line x1={wallX + 5} y1={Y(screenTop)} x2={wallX + 5} y2={Y(mountBottom)} />
          <line x1={wallX + 3} y1={Y(screenTop)} x2={wallX + 7} y2={Y(screenTop)} />
          <line x1={wallX + 3} y1={Y(mountBottom)} x2={wallX + 7} y2={Y(mountBottom)} />
          <text
            x={wallX + 9}
            y={Y(screenTop) + size.height / 2}
            fontSize={FS * 0.85}
            fill={ACCENT}
            dominantBaseline="middle"
            stroke="none"
          >
            {`H ${fmtLen(size.height, units)}`}
          </text>
        </g>

        {/* eye level */}
        <line
          x1={wallX}
          y1={Y(eyeH)}
          x2={px + 24}
          y2={Y(eyeH)}
          stroke={EYE}
          strokeWidth={sw.thin}
          strokeDasharray="3 2"
        />
        <text x={px + 25} y={Y(eyeH)} fontSize={FS * 0.85} fill={EYE} dominantBaseline="middle">
          {`eye ${fmtLen(eyeH, units)}`}
        </text>

        {/* reach envelope arcs (max + comfortable) */}
        <circle
          cx={px}
          cy={Y(shoulderH)}
          r={armLen}
          fill="none"
          stroke={ACCENT}
          strokeWidth={sw.thin}
          strokeDasharray="2 2"
          opacity={0.4}
        />
        <circle
          cx={px}
          cy={Y(shoulderH)}
          r={armLen * 0.5}
          fill="none"
          stroke={ACCENT}
          strokeWidth={sw.hair}
          strokeDasharray="2 2"
          opacity={0.35}
        />

        <Person
          px={px}
          Y={Y}
          seated={persona.seated}
          eyeH={eyeH}
          shoulderH={shoulderH}
          hipH={hipH}
        />

        {/* reaching arm */}
        <line
          x1={px}
          y1={Y(shoulderH)}
          x2={X(handDepth)}
          y2={Y(handHeight)}
          stroke={SKIN}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <circle cx={X(handDepth)} cy={Y(handHeight)} r={2.4} fill={touches ? GREEN : '#e06c6c'} />

        {/* dimensions */}
        <VDim x={wallX - 9} y0={groundY} y1={Y(mountBottom)} label={fmtLen(mountBottom, units)} fs={FS} />
        <VDim x={wallX - 19} y0={groundY} y1={Y(screenTop)} label={fmtLen(screenTop, units)} fs={FS} />
        <HDim
          y={groundY + 13}
          x0={wallX}
          x1={px}
          label={`${fmtDist(distance, units)} ${s.mode === 'touch' ? '(touch)' : ''}`}
          fs={FS}
        />

        <SpecBlock
          x={VBW - mR - 78}
          y={mT}
          rows={[
            ['Screen', `${Math.round(s.diagonal)}"  ${s.aspectW}:${s.aspectH}`],
            ['W × H', `${fmtLen(size.width, units)} × ${fmtLen(size.height, units)}`],
            ['Mount (bottom)', fmtLen(mountBottom, units)],
            ['Top of screen', fmtLen(screenTop, units)],
            ['Eye level', fmtLen(eyeH, units)],
            ['ADA reach', `15–48"`],
            ['Distance', `${fmtDist(distance, units)} (${s.mode})`],
            ['Viewer', persona.label],
          ]}
          verdict={`${VLEVEL[v.level]} — ${v.horizontalAngle.toFixed(0)}° FOV`}
          verdictColor={VCOLOR[v.level]}
        />
      </svg>
    </div>
  );
}

const haloStyle: React.CSSProperties = {
  paintOrder: 'stroke',
  stroke: '#ffffff',
  strokeWidth: 1.1,
};

const VLEVEL = { good: 'GOOD', caution: 'CAUTION', bad: 'BAD IDEA' } as const;
const VCOLOR = { good: GREEN, caution: '#b8860b', bad: '#c0392b' } as const;

/** Title/spec block — the things a side elevation can't show as a dimension. */
function SpecBlock({
  x,
  y,
  rows,
  verdict,
  verdictColor,
}: {
  x: number;
  y: number;
  rows: [string, string][];
  verdict: string;
  verdictColor: string;
}) {
  const lh = 5.4;
  const w = 78;
  const padX = 3;
  const h = 8 + (rows.length + 1.6) * lh;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2} fill="#ffffff" stroke="#c4ccd5" strokeWidth={0.4} />
      {rows.map(([label, val], i) => {
        const ly = y + 6 + i * lh;
        return (
          <g key={label} fontSize={3.4}>
            <text x={x + padX} y={ly} fill="#6b7480">
              {label}
            </text>
            <text x={x + w - padX} y={ly} fill="#10202e" textAnchor="end">
              {val}
            </text>
          </g>
        );
      })}
      <line x1={x + padX} y1={y + 4 + rows.length * lh} x2={x + w - padX} y2={y + 4 + rows.length * lh} stroke="#dde2e8" strokeWidth={0.4} />
      <text x={x + padX} y={y + 6 + (rows.length + 0.9) * lh} fontSize={4.2} fontWeight="bold" fill={verdictColor}>
        {verdict}
      </text>
    </g>
  );
}

function Person({
  px,
  Y,
  seated,
  eyeH,
  shoulderH,
  hipH,
}: {
  px: number;
  Y: (h: number) => number;
  seated: boolean;
  eyeH: number;
  shoulderH: number;
  hipH: number;
}) {
  return (
    <g stroke={BODY} strokeLinecap="round" fill="none">
      {/* head */}
      <circle cx={px} cy={Y(eyeH + 3)} r={4} fill={SKIN} stroke="none" />
      {/* neck */}
      <line x1={px} y1={Y(shoulderH)} x2={px} y2={Y(eyeH - 1)} strokeWidth={2.4} />
      {/* torso */}
      <line x1={px} y1={Y(hipH)} x2={px} y2={Y(shoulderH)} strokeWidth={9} />
      {seated ? (
        <>
          {/* thigh forward (toward wall), shin down */}
          <line x1={px} y1={Y(hipH)} x2={px - 15} y2={Y(hipH)} strokeWidth={7} />
          <line x1={px - 15} y1={Y(hipH)} x2={px - 15} y2={Y(2)} strokeWidth={6} />
          {/* wheelchair */}
          <circle cx={px} cy={Y(11)} r={11} strokeWidth={1.4} stroke="#1a2026" />
          <line x1={px - 16} y1={Y(hipH - 2)} x2={px + 6} y2={Y(hipH - 2)} strokeWidth={2} stroke="#2b3440" />
          <line x1={px + 7} y1={Y(hipH - 2)} x2={px + 7} y2={Y(hipH + 18)} strokeWidth={2} stroke="#2b3440" />
        </>
      ) : (
        <line x1={px} y1={Y(hipH)} x2={px} y2={Y(0)} strokeWidth={7} />
      )}
    </g>
  );
}

function VDim({
  x,
  y0,
  y1,
  label,
  fs,
}: {
  x: number;
  y0: number;
  y1: number;
  label: string;
  fs: number;
}) {
  return (
    <g stroke={DARK} strokeWidth={0.35}>
      <line x1={x} y1={y0} x2={x} y2={y1} />
      <line x1={x - 2} y1={y0} x2={x + 2} y2={y0} />
      <line x1={x - 2} y1={y1} x2={x + 2} y2={y1} />
      <text
        x={x - 3}
        y={(y0 + y1) / 2}
        fontSize={fs}
        fill={DARK}
        textAnchor="end"
        dominantBaseline="middle"
        stroke="none"
      >
        {label}
      </text>
    </g>
  );
}

function HDim({
  y,
  x0,
  x1,
  label,
  fs,
}: {
  y: number;
  x0: number;
  x1: number;
  label: string;
  fs: number;
}) {
  return (
    <g stroke={DARK} strokeWidth={0.35}>
      <line x1={x0} y1={y} x2={x1} y2={y} />
      <line x1={x0} y1={y - 2} x2={x0} y2={y + 2} />
      <line x1={x1} y1={y - 2} x2={x1} y2={y + 2} />
      <text
        x={(x0 + x1) / 2}
        y={y + 6}
        fontSize={fs}
        fill={DARK}
        textAnchor="middle"
        stroke="none"
      >
        {label}
      </text>
    </g>
  );
}
