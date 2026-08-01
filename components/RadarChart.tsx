'use client'

// 五邊形能力雷達圖:三圈刻度對應等級門檻(⅓ 入門、⅔ 熟練、外圈專家)
export interface RadarAxis {
  label: string
  ratio: number // 0~1(已掌握題數比例)
}

const CX = 160
const CY = 150
const R = 105

function pt(i: number, r: number): [number, number] {
  const ang = (-90 + i * 72) * (Math.PI / 180)
  return [CX + r * Math.cos(ang), CY + r * Math.sin(ang)]
}

function ring(r: number): string {
  return Array.from({ length: 5 }, (_, i) => pt(i, r).map((v) => v.toFixed(1)).join(',')).join(' ')
}

export default function RadarChart({ axes }: { axes: RadarAxis[] }) {
  const data = Array.from({ length: 5 }, (_, i) =>
    pt(i, Math.max(axes[i]?.ratio ?? 0, 0.02) * R).map((v) => v.toFixed(1)).join(','),
  ).join(' ')

  return (
    <svg viewBox="0 0 320 300" className="mx-auto w-full max-w-sm">
      {/* 三圈刻度=等級門檻 */}
      {[1 / 3, 2 / 3, 1].map((f) => (
        <polygon
          key={f}
          points={ring(f * R)}
          fill="none"
          className={f === 1 ? 'stroke-neutral-400 dark:stroke-neutral-600' : 'stroke-neutral-300 dark:stroke-neutral-700'}
          strokeWidth={f === 1 ? 1.5 : 1}
          strokeDasharray={f === 1 ? undefined : '4 4'}
        />
      ))}
      {/* 軸線 */}
      {Array.from({ length: 5 }, (_, i) => {
        const [x, y] = pt(i, R)
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} className="stroke-neutral-200 dark:stroke-neutral-800" strokeWidth={1} />
      })}
      {/* 刻度標籤(貼著第 0 軸) */}
      <text x={CX + 6} y={CY - R / 3 + 4} fontSize="9" className="fill-neutral-400">入門</text>
      <text x={CX + 6} y={CY - (2 * R) / 3 + 4} fontSize="9" className="fill-neutral-400">熟練</text>
      <text x={CX + 6} y={CY - R + 10} fontSize="9" className="fill-neutral-400">專家</text>
      {/* 資料多邊形 */}
      <polygon points={data} className="fill-sky-500/25 stroke-sky-500" strokeWidth={2} strokeLinejoin="round" />
      {Array.from({ length: 5 }, (_, i) => {
        const [x, y] = pt(i, Math.max(axes[i]?.ratio ?? 0, 0.02) * R)
        return <circle key={i} cx={x} cy={y} r={3.5} className="fill-sky-500" />
      })}
      {/* 軸標籤+百分比 */}
      {axes.map((a, i) => {
        const [x, y] = pt(i, R + 24)
        return (
          <g key={i} textAnchor="middle">
            <text x={x} y={y - 2} fontSize="12" fontWeight="bold" className="fill-neutral-700 dark:fill-neutral-200">
              {a.label}
            </text>
            <text x={x} y={y + 12} fontSize="10" className="fill-neutral-400">
              {Math.round(a.ratio * 100)}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}
