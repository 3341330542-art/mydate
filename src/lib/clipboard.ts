/** 复制文本到剪贴板，带一个兼容旧浏览器 / 非 HTTPS 环境的兜底方案 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* 继续尝试兜底方案 */
  }

  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-1000px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, ta.value.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/** 调起系统分享面板，不支持时回退到复制 */
export async function shareText(options: {
  title: string
  text: string
  url: string
}): Promise<'shared' | 'copied' | 'failed'> {
  const nav = navigator as Navigator & {
    share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>
  }

  if (typeof nav.share === 'function') {
    try {
      await nav.share(options)
      return 'shared'
    } catch (err) {
      // 用户取消分享不算失败
      if (err instanceof DOMException && err.name === 'AbortError') return 'shared'
    }
  }

  const ok = await copyText(`${options.text}\n${options.url}`)
  return ok ? 'copied' : 'failed'
}
