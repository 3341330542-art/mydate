/**
 * 日期与统计逻辑自测
 * ============================================================================
 * 这些函数决定了首页倒计时、分组和「我们的数据」，算错一天都会被看出来，
 * 所以单独跑一遍。用 TypeScript 自带的编译器把 src/lib 里的纯逻辑代码
 * 转成 CommonJS 再执行，不需要引入任何测试框架。
 *
 * 运行：npm run logic:test
 */
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import ts from 'typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const LIB = join(ROOT, 'src', 'lib')
const TMP = join(ROOT, '.tmp-logic-test')

/* ------------------------------------------------ 把 TS 转成 CJS 再加载 */

const FILES = ['types.ts', 'activities.ts', 'datetime.ts', 'selectors.ts']

rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })

for (const file of FILES) {
  const source = readFileSync(join(LIB, file), 'utf8')
  const { outputText, diagnostics } = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  })
  const errors = (diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error)
  if (errors.length > 0) {
    console.error(`编译 ${file} 失败：`, errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, ' ')))
    process.exit(1)
  }
  writeFileSync(join(TMP, file.replace(/\.ts$/, '.js')), outputText)
}

writeFileSync(join(TMP, 'package.json'), JSON.stringify({ type: 'commonjs' }))

const require = createRequire(pathToFileURL(join(TMP, 'index.js')))
const dt = require(join(TMP, 'datetime.js'))
const sel = require(join(TMP, 'selectors.js'))
const act = require(join(TMP, 'activities.js'))

/* ------------------------------------------------------------------ 断言 */

let passed = 0
const failures = []

function ok(name, cond, detail = '') {
  if (cond) {
    passed += 1
    console.log(`  \u2713 ${name}`)
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
    console.log(`  \u2717 ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function eq(name, actual, expected) {
  ok(name, actual === expected, `期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`)
}

function section(t) {
  console.log(`\n${t}`)
}

/* ------------------------------------------------------------------ 工具 */

const iso = (offsetDays) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return dt.toISODate(d)
}

console.log('约会小程序 · 日期与统计逻辑自测')
console.log('='.repeat(64))

section('[1/5] 日期格式化')
eq('parseDay 解析后是同一天', dt.parseDay('2026-03-14').getDate(), 14)
ok(
  'parseDay 不受时区影响（本地 00:00）',
  dt.parseDay('2026-03-14').getHours() === 0,
  `实际 ${dt.parseDay('2026-03-14').getHours()} 点`,
)
eq('formatMonthDay', dt.formatMonthDay('2026-03-14'), '3月14日')
eq('formatFullDate', dt.formatFullDate('2026-03-14'), '2026年3月14日')
eq('weekdayCN：2026-03-14 是周六', dt.weekdayCN('2026-03-14'), '周六')
eq('weekdayCN：2024-05-20 是周一', dt.weekdayCN('2024-05-20'), '周一')
eq('dayNumber 补零', dt.dayNumber('2026-03-04'), '04')
eq('formatMoney 整数', dt.formatMoney(240), '¥240')
eq('formatMoney 小数', dt.formatMoney(78.5), '¥78.50')
eq('formatMoney 0 显示为 ¥0', dt.formatMoney(0), '¥0')
eq('formatMoney 负数返回 null', dt.formatMoney(-1), null)
eq('formatMoney 消除浮点噪声', dt.formatMoney(0.1 + 0.2), '¥0.30')
eq('normalizeTime 去掉秒', dt.normalizeTime('19:30:00'), '19:30')
eq('normalizeTime 空值', dt.normalizeTime(null), null)
eq('friendlyTime 晚上', dt.friendlyTime('19:30'), '晚上 7:30')
eq('friendlyTime 整点不显示分钟', dt.friendlyTime('14:00'), '下午 2')
eq('friendlyTime 中午', dt.friendlyTime('12:00'), '中午 12')

section('[2/5] 倒计时文案')
eq('今天', dt.countdownOf(iso(0)).text, '就是今天呀 ❤️')
eq('明天', dt.countdownOf(iso(1)).text, '明天就能见到你啦 ❤️')
eq('3 天后', dt.countdownOf(iso(3)).text, '距离我们的下一次约会还有 3 天 ❤️')
eq('昨天算过去', dt.countdownOf(iso(-1)).kind, 'past')
eq('过去 5 天', dt.countdownOf(iso(-5)).text, '这次约会已经过去 5 天了')
eq('未来标签', dt.countdownOf(iso(7)).short, '7 天后')
eq('今天标签', dt.countdownOf(iso(0)).short, '今天')

section('[3/5] 在一起多少天')
eq('纪念日当天算第 1 天', dt.daysTogether(iso(0)), 1)
eq('昨天开始算第 2 天', dt.daysTogether(iso(-1)), 2)
eq('一年前', dt.daysTogether(iso(-364)), 365)
eq('没设置纪念日返回 null', dt.daysTogether(null), null)
eq('未来的纪念日返回 null', dt.daysTogether(iso(3)), null)

section('[4/5] 选出「下一次约会」与分组')
const mk = (id, dateOn, status, extra = {}) => ({
  id,
  title: id,
  dateOn,
  timeAt: null,
  place: null,
  activity: 'other',
  budget: null,
  note: null,
  status,
  completedAt: null,
  createdBy: 'u1',
  updatedBy: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...extra,
})

const sample = [
  mk('done-future', iso(2), 'done'),
  mk('planned-far', iso(10), 'planned'),
  mk('planned-soon', iso(3), 'planned'),
  mk('planned-today', iso(0), 'planned'),
  mk('planned-past', iso(-4), 'planned'),
  mk('done-past', iso(-9), 'done'),
]

eq('下一次约会是今天那次', sel.pickNextDate(sample)?.id, 'planned-today')
ok(
  '已完成的不参与选择',
  !['done-future', 'done-past'].includes(sel.pickNextDate(sample)?.id),
)
eq(
  '没有未来计划时，回退到最近一次过期的',
  sel.pickNextDate(sample.filter((d) => d.dateOn < iso(0)))?.id,
  'planned-past',
)
eq('全部完成时没有下一次', sel.pickNextDate([mk('a', iso(1), 'done')]), null)

const g = sel.groupDates(sample)
eq('即将到来有 3 条', g.upcoming.length, 3)
eq('即将到来按时间升序', g.upcoming[0].id, 'planned-today')
eq('已完成有 2 条', g.done.length, 2)
eq('过期未完成有 1 条', g.missed.length, 1)
eq('过期未完成是那一条', g.missed[0].id, 'planned-past')

section('[5/5] 我们的数据统计')
const stats = sel.computeStats(
  [
    mk('a', iso(-5), 'done', { budget: 100, activity: 'eat' }),
    mk('b', iso(-2), 'done', { budget: 50.5, activity: 'eat' }),
    mk('c', iso(3), 'planned', { budget: 200, activity: 'movie' }),
    mk('d', iso(6), 'planned', { budget: null, activity: 'eat' }),
  ],
  iso(-9),
)
eq('约会总数', stats.total, 4)
eq('已完成', stats.done, 2)
eq('待赴约', stats.planned, 2)
eq('已完成花费', stats.spent, 150.5)
eq('计划中花费', stats.plannedSpend, 200)
eq('在一起天数', stats.daysTogether, 10)
eq('活动分布条目数', stats.byActivity.length, 2)
eq(
  '吃饭次数最多',
  stats.byActivity.find((x) => x.key === 'eat')?.count,
  3,
)
ok(
  '没有记录的活动类型不出现在分布里',
  !stats.byActivity.some((x) => x.key === 'travel'),
)

section('活动类型映射')
eq('已知类型', act.activityOf('travel').label, '旅行')
eq('未知类型回退到「其他」', act.activityOf('nonsense').key, 'other')
eq('空值回退到「其他」', act.activityOf(null).key, 'other')
eq('8 种活动类型', act.ACTIVITIES.length, 8)

/* ------------------------------------------------------------------ 汇总 */

rmSync(TMP, { recursive: true, force: true })

console.log('\n' + '='.repeat(64))
if (failures.length === 0) {
  console.log(`全部通过：${passed} 项检查 \u2713`)
} else {
  console.log(`通过 ${passed} 项，失败 ${failures.length} 项：`)
  failures.forEach((f) => console.log(`  · ${f}`))
}
process.exit(failures.length === 0 ? 0 : 1)
