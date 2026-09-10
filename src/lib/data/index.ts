import { DEMO_MODE, HAS_SUPABASE } from '../config'
import { AppError } from '../errors'
import { createDemoDataProvider } from './demo-provider'
import type { DataProvider } from './provider'
import { createSupabaseDataProvider } from './supabase-provider'

let cached: DataProvider | null = null

/** 当前使用的数据实现。优先 Supabase；显式开启演示模式时用内存假数据。 */
export function getDataProvider(): DataProvider {
  if (cached) return cached

  if (HAS_SUPABASE) {
    cached = createSupabaseDataProvider()
  } else if (DEMO_MODE) {
    cached = createDemoDataProvider()
  } else {
    throw new AppError('NOT_CONFIGURED')
  }

  return cached
}

export type { DataProvider } from './provider'
