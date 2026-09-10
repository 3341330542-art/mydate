/** 统一的错误类型与中文提示 */

export type AppErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'INVALID_CODE'
  | 'SPACE_FULL'
  | 'NO_SPACE'
  | 'BAD_CREDENTIALS'
  | 'EMAIL_TAKEN'
  | 'WEAK_PASSWORD'
  | 'EMAIL_NOT_CONFIRMED'
  | 'RATE_LIMITED'
  | 'NOT_CONFIGURED'
  | 'NETWORK'
  | 'UNKNOWN'

export class AppError extends Error {
  code: AppErrorCode
  constructor(code: AppErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'AppError'
    this.code = code
  }
}

const MESSAGES: Record<AppErrorCode, string> = {
  NOT_AUTHENTICATED: '登录状态已失效，请重新登录',
  INVALID_CODE: '邀请码不对，检查一下有没有输错～',
  SPACE_FULL: '这个情侣空间已经有两个人啦',
  NO_SPACE: '你还没有创建情侣空间',
  BAD_CREDENTIALS: '邮箱或密码不正确',
  EMAIL_TAKEN: '这个邮箱已经注册过了，直接登录吧',
  WEAK_PASSWORD: '密码至少 6 位哦',
  EMAIL_NOT_CONFIRMED: '请先到邮箱里点一下确认链接',
  RATE_LIMITED: '操作有点频繁，稍等一会儿再试',
  NOT_CONFIGURED: '还没有配置数据库，请先看 README 的部署教程',
  NETWORK: '网络好像不太顺畅，检查一下连接再试',
  UNKNOWN: '出了点小状况，再试一次吧',
}

export function messageOf(err: unknown): string {
  if (err instanceof AppError) return err.message || MESSAGES[err.code]
  if (err instanceof Error && err.message) return err.message
  return MESSAGES.UNKNOWN
}

/** 把 Supabase / 网络错误翻译成 AppError */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err

  const raw = err instanceof Error ? err.message : String(err ?? '')
  const lower = raw.toLowerCase()

  // 数据库 RPC 里 raise exception 'XXX'
  if (lower.includes('invalid_code')) return new AppError('INVALID_CODE')
  if (lower.includes('space_full')) return new AppError('SPACE_FULL')
  if (lower.includes('not_authenticated')) return new AppError('NOT_AUTHENTICATED')

  if (lower.includes('invalid login credentials')) return new AppError('BAD_CREDENTIALS')
  if (lower.includes('email not confirmed')) return new AppError('EMAIL_NOT_CONFIRMED')
  if (lower.includes('already registered') || lower.includes('already been registered'))
    return new AppError('EMAIL_TAKEN')
  if (lower.includes('password should be at least'))
    return new AppError('WEAK_PASSWORD', '密码至少 6 位哦')
  if (lower.includes('for security purposes') || lower.includes('rate limit'))
    return new AppError('RATE_LIMITED')
  if (lower.includes('failed to fetch') || lower.includes('networkerror'))
    return new AppError('NETWORK')

  // PostgREST 的原始错误码（例如 PGRST116 = 期望单行却拿到 0 行）。
  // 直接把英文原文弹给用户太突兀，换成一句中文。
  if (/pgrst\d+/i.test(lower) || lower.includes('json object requested'))
    return new AppError('UNKNOWN', '这条数据已经不在了，刷新一下页面看看')

  return new AppError('UNKNOWN', raw || MESSAGES.UNKNOWN)
}
