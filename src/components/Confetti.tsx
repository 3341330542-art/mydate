'use client'

import { useMemo } from 'react'

const COLORS = ['#D8506A', '#F6CDD5', '#F3C3CD', '#B03A52', '#F9DEE5', '#E9B9A8']

/**
 * 一层很轻的彩纸动效，用于「完成约会」「抽中结果」这类时刻。
 * 纯 CSS 动画，不引入任何动画库。
 */
export function Confetti({ count = 16 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
        const radius = 90 + Math.random() * 110
        return {
          id: i,
          left: `${30 + Math.random() * 40}%`,
          top: `${38 + Math.random() * 16}%`,
          color: COLORS[i % COLORS.length],
          cx: `${Math.cos(angle) * radius}px`,
          cy: `${Math.sin(angle) * radius - 60}px`,
          cr: `${Math.round(Math.random() * 520 - 260)}deg`,
          delay: `${Math.random() * 0.16}s`,
          size: 5 + Math.round(Math.random() * 5),
          round: i % 3 === 0,
        }
      }),
    [count],
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="animate-confetti absolute block"
          style={
            {
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size * (p.round ? 1 : 1.7),
              background: p.color,
              borderRadius: p.round ? '999px' : '2px',
              animationDelay: p.delay,
              '--cx': p.cx,
              '--cy': p.cy,
              '--cr': p.cr,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
