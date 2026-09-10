'use client'

import { useEffect, useState } from 'react'

/**
 * 二维码。用 qrcode 在浏览器里直接把文字渲染成 data url，
 * 所以不依赖任何外部图片服务，离线也能显示。
 */
export function QrCode({
  value,
  size = 196,
  className = '',
}: {
  value: string
  size?: number
  className?: string
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    setFailed(false)

    void (async () => {
      try {
        const QR = await import('qrcode')
        const url = await QR.toDataURL(value, {
          width: size * 2, // 2 倍分辨率，手机上更清晰
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#2C2429', light: '#FFFFFF' },
        })
        if (alive) setDataUrl(url)
      } catch {
        if (alive) setFailed(true)
      }
    })()

    return () => {
      alive = false
    }
  }, [value, size])

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-cream-2 text-center text-[11px] leading-relaxed text-ink-3 ${className}`}
        style={{ width: size, height: size }}
      >
        二维码生成失败
        <br />
        请直接复制上面的链接
      </div>
    )
  }

  if (!dataUrl) {
    return (
      <div
        className={`skeleton rounded-2xl ${className}`}
        style={{ width: size, height: size }}
        aria-label="二维码生成中"
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="邀请二维码"
      width={size}
      height={size}
      className={`rounded-2xl bg-white ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
