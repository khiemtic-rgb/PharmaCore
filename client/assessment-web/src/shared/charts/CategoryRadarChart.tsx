import type { CategoryScore } from '@/shared/api/assessment.api';

type Props = {
  categories: CategoryScore[];
  benchmark?: { code: string; cohortMean?: number | null }[];
  size?: number;
};

function polar(cx: number, cy: number, r: number, index: number, count: number) {
  const angle = -Math.PI / 2 + index * ((2 * Math.PI) / count);
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function polygonPoints(cx: number, cy: number, r: number, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const p = polar(cx, cy, r, i, count);
    return `${p.x},${p.y}`;
  }).join(' ');
}

function valuePoints(cx: number, cy: number, radius: number, values: number[], count: number) {
  return values
    .map((v, i) => {
      const p = polar(cx, cy, radius * Math.max(0, Math.min(1, v / 4)), i, count);
      return `${p.x},${p.y}`;
    })
    .join(' ');
}

export function CategoryRadarChart({ categories, benchmark, size = 320 }: Props) {
  const sorted = [...categories].sort((a, b) => a.code.localeCompare(b.code));
  const count = sorted.length || 1;
  const cx = size / 2;
  const cy = size / 2 + 8;
  const radius = size * 0.32;
  const benchMap = new Map(benchmark?.map((b) => [b.code, b.cohortMean ?? null]) ?? []);

  const benchValues = sorted.map((c) => benchMap.get(c.code) ?? 0);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="kap-radar" role="img" aria-label="Biểu đồ radar năng lực">
      <text x={cx} y={18} textAnchor="middle" className="kap-radar-title">
        Biểu đồ năng lực 6 nhóm
      </text>
      {[1, 2, 3, 4].map((ring) => (
        <polygon
          key={ring}
          points={polygonPoints(cx, cy, (radius * ring) / 4, count)}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={1}
        />
      ))}
      {sorted.map((_, i) => {
        const p = polar(cx, cy, radius, i, count);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#cbd5e1" strokeWidth={1} />;
      })}
      {benchValues.some((v) => v > 0) && (
        <polygon
          points={valuePoints(cx, cy, radius, benchValues, count)}
          fill="rgba(245,158,11,0.12)"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
      )}
      <polygon
        points={valuePoints(
          cx,
          cy,
          radius,
          sorted.map((c) => c.score),
          count,
        )}
        fill="rgba(15,118,110,0.2)"
        stroke="#0f766e"
        strokeWidth={2}
      />
      {sorted.map((cat, i) => {
        const p = polar(cx, cy, radius + 22, i, count);
        const label = cat.name.length > 12 ? `${cat.name.slice(0, 11)}…` : cat.name;
        return (
          <text key={cat.code} x={p.x} y={p.y} textAnchor="middle" className="kap-radar-label">
            {label}
          </text>
        );
      })}
      <g transform={`translate(${size - 120}, ${size - 28})`}>
        <rect x={0} y={0} width={10} height={10} fill="#0f766e" />
        <text x={14} y={9} className="kap-radar-legend">
          Bạn
        </text>
        <rect x={0} y={14} width={10} height={10} fill="none" stroke="#f59e0b" strokeDasharray="3 2" />
        <text x={14} y={23} className="kap-radar-legend">
          Tham chiếu
        </text>
      </g>
    </svg>
  );
}
