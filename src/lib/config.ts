/**
 * 运行时配置。
 *
 * 只有 NEXT_PUBLIC_* 变量会进入浏览器包，这是有意为之：
 * Supabase 的 anon key 本来就是公开密钥，真正的数据权限由数据库 RLS 策略控制，
 * 所以它可以安全地出现在前端代码里。
 * 数据库密码 / service_role key 绝不能放到任何 NEXT_PUBLIC_* 变量中。
 */

export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()

/** 部署后的正式域名，用于生成邀请链接和二维码；留空则用当前浏览器地址 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '')

/** 本地演示模式：不连接数据库，用内置假数据预览界面（数据不会保存） */
export const DEMO_MODE = ['1', 'true', 'yes'].includes(
  (process.env.NEXT_PUBLIC_DEMO_MODE ?? '').trim().toLowerCase(),
)

/** 是否已经填好了 Supabase 配置 */
export const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export const APP_NAME = '我们的小天地'
export const APP_SLOGAN = '和喜欢的人，一起去喜欢的地方。'

/** 当前站点 base url（不带结尾斜杠） */
export function getBaseUrl(): string {
  if (SITE_URL) return SITE_URL
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

/** 生成邀请链接 */
export function inviteUrl(code: string): string {
  const base = getBaseUrl()
  return `${base}/join?code=${encodeURIComponent(code)}`
}
