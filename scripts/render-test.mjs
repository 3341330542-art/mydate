/**
 * 页面渲染自测
 * ============================================================================
 * 用真正的 React 把每一个页面渲染成 HTML，检查：
 *   · 页面组件会不会在运行时抛错（空值访问、undefined 之类的常见崩溃）
 *   · 渲染出来的内容里有没有它该有的文字
 *
 * 做法：把 src/ 下的 TS/TSX 用 TypeScript 编译器转成 CommonJS 放到临时目录，
 * 把 next/link 和 next/navigation 换成桩实现，然后往 AppContext 里注入
 * 一份演示数据，逐个 renderToStaticMarkup。
 *
 * 好处是不需要浏览器、不需要起服务，改完代码 `npm run render:test` 几秒就能跑完。
 *
 * 运行：npm run render:test
 */
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'src')
const TMP = join(ROOT, '.tmp-render-test')

/* ------------------------------------------------- 1. 把 src 转成 CommonJS */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.tsx?$/.test(entry)) out.push(full)
  }
  return out
}

rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })

const files = walk(SRC)
let skipped = 0

for (const file of files) {
  const source = readFileSync(file, 'utf8')

  // 只有 layout.tsx 会 import CSS，跳过它（测试不关心全局样式）
  if (/^\s*import\s+['"].*\.css['"]/m.test(source)) {
    skipped += 1
    continue
  }

  const { outputText, diagnostics } = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  })

  const errors = (diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error)
  if (errors.length > 0) {
    console.error(`编译 ${relative(ROOT, file)} 失败：`)
    errors.forEach((e) => console.error('  ' + ts.flattenDiagnosticMessageText(e.messageText, ' ')))
    process.exit(1)
  }

  const rel = relative(SRC, file).replace(/\.tsx?$/, '.js')
  const target = join(TMP, rel)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, outputText)
}

writeFileSync(join(TMP, 'package.json'), JSON.stringify({ type: 'commonjs' }))

/* ------------------------------------------- 2. next/link 与 next/navigation 桩 */

const stubDir = join(TMP, 'node_modules', 'next')
mkdirSync(stubDir, { recursive: true })
writeFileSync(join(stubDir, 'package.json'), JSON.stringify({ name: 'next', version: '0.0.0' }))

writeFileSync(
  join(stubDir, 'link.js'),
  `const React = require('react')
function Link({ href, children, ...rest }) {
  const url = typeof href === 'string' ? href : (href && href.pathname) || '#'
  return React.createElement('a', { href: url, ...rest }, children)
}
module.exports = Link
module.exports.default = Link
`,
)

writeFileSync(
  join(stubDir, 'navigation.js'),
  `const noop = () => {}
const router = {
  push: noop, replace: noop, back: noop, forward: noop,
  refresh: noop, prefetch: noop,
}
exports.useRouter = () => router
exports.usePathname = () => globalThis.__TEST_PATHNAME__ ?? '/'
exports.useParams = () => globalThis.__TEST_PARAMS__ ?? {}
exports.useSearchParams = () => new URLSearchParams()
exports.redirect = noop
exports.notFound = noop
`,
)

/* ----------------------------------------------- 3. 加载（@/ 别名要自己解析） */

const require = createRequire(join(TMP, 'entry.js'))
const Module = require('node:module')

const originalResolve = Module._resolveFilename
Module._resolveFilename = function (request, parent, ...rest) {
  if (typeof request === 'string' && request.startsWith('@/')) {
    return originalResolve.call(this, join(TMP, request.slice(2)), parent, ...rest)
  }
  return originalResolve.call(this, request, parent, ...rest)
}

const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

const { AppContext } = require(join(TMP, 'components', 'AppProvider.js'))
const { ToastProvider } = require(join(TMP, 'components', 'Toast.js'))
const { computeStats } = require(join(TMP, 'lib', 'selectors.js'))
const { createDemoDataProvider } = require(join(TMP, 'lib', 'data', 'demo-provider.js'))

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

/* ---------------------------------------------------------------- 造数据 */

console.log('情侣约会空间 · 页面渲染自测')
console.log('='.repeat(64))
console.log(`\n把 ${files.length - skipped} 个源文件转成 CommonJS 放进临时目录 …\n`)

const demo = createDemoDataProvider()
const snapshot = await demo.loadSpace()
const dates = await demo.listDates()
const ideas = await demo.listIdeas()

const context = {
  status: 'ready',
  errorMessage: null,
  demo: true,
  syncEnabled: false,
  session: { userId: 'demo-me', email: 'demo@example.com' },
  me: snapshot.me,
  partner: snapshot.members.find((m) => m.id !== 'demo-me') ?? null,
  space: snapshot.space,
  members: snapshot.members,
  dates,
  ideas,
  stats: computeStats(dates, snapshot.space?.anniversary ?? null),
  pending: false,
  refresh: async () => {},
  retry: () => {},
  signIn: async () => {},
  signUp: async () => ({ needsEmailConfirm: false }),
  signOut: async () => {},
  createSpace: async () => {},
  joinSpace: async () => {},
  previewInvite: async () => null,
  updateSpace: async () => {},
  regenerateInviteCode: async () => 'NEW123',
  updateMyProfile: async () => {},
  createDate: async () => dates[0],
  updateDate: async () => dates[0],
  deleteDate: async () => {},
  addIdea: async () => ideas[0],
  deleteIdea: async () => {},
}

/* ------------------------------------------------------------------ 用例 */

const CASES = [
  {
    name: '首页',
    file: 'app/page.js',
    path: '/',
    must: [
      '和喜欢的人，一起去喜欢的地方',
      '下一次约会',
      '距离我们的下一次约会还有 3 天',
      '去看那家新开的美术馆',
      '西岸美术馆',
      '我们的数据',
      '近期安排',
      '新建约会',
    ],
  },
  {
    name: '约会列表',
    file: 'app/dates/page.js',
    path: '/dates',
    must: ['我们的约会', '待赴约', '已完成', '全部', '去看那家新开的美术馆', '老地方吃拉面'],
  },
  {
    name: '约会详情（待赴约）',
    file: 'app/dates/[id]/page.js',
    path: '/dates/d1',
    params: { id: 'd1' },
    must: [
      '去看那家新开的美术馆',
      '西岸美术馆',
      '预计花费',
      '¥240',
      '记得提前在公众号预约',
      '标记为已完成',
      '编辑这次约会',
      '删除这次约会',
    ],
  },
  {
    name: '约会详情（已完成）',
    file: 'app/dates/[id]/page.js',
    path: '/dates/d4',
    params: { id: 'd4' },
    must: ['这次约会完成啦', '改回待赴约', '一起看了那部期待很久的电影', '万象城'],
  },
  {
    name: '约会详情（不存在的 id）',
    file: 'app/dates/[id]/page.js',
    path: '/dates/does-not-exist',
    params: { id: 'does-not-exist' },
    must: ['这次约会不见了'],
  },
  {
    name: '新建约会',
    file: 'app/dates/new/page.js',
    path: '/dates/new',
    must: ['新建约会'],
  },
  {
    name: '编辑约会',
    file: 'app/dates/[id]/edit/page.js',
    path: '/dates/d2/edit',
    params: { id: 'd2' },
    must: ['编辑约会', '老地方吃拉面', '保存修改', '巷口那家面馆'],
  },
  {
    name: '登录页',
    file: 'app/login/page.js',
    path: '/login',
    must: ['我们的小天地', '和喜欢的人，一起去喜欢的地方', '登录', '注册', '邮箱', '密码'],
  },
  {
    name: '邀请落地页',
    file: 'app/join/page.js',
    path: '/join',
    must: ['你已经在情侣空间里啦', '回到首页'],
  },
  {
    name: '创建空间 / 输入邀请码',
    file: 'app/welcome/page.js',
    path: '/welcome',
    must: ['建立你们的小天地', '空间名字', '我们在一起的日子', '有邀请码'],
  },
  {
    name: '互动页',
    file: 'app/play/page.js',
    path: '/play',
    must: [
      '今天想做什么',
      '约会抽签',
      '我们的灵感清单',
      '一起做一顿饭',
      '去公园散步',
      '开始抽签',
      '唱一次 KTV',
    ],
  },
  {
    name: '我的',
    file: 'app/me/page.js',
    path: '/me',
    must: [
      '邀请另一半',
      '邀请码',
      'LOVE26',
      '我们的小天地',
      '在一起的日子',
      '我们的数据',
      '退出登录',
      '2025年', // 在一起的日子渲染成了完整日期
    ],
  },
]

const PAGES = CASES.map((c) => {
  const mod = require(join(TMP, c.file))
  return { ...c, Component: mod.default ?? mod }
})

for (const c of PAGES) {
  console.log(`[${c.name}]`)
  globalThis.__TEST_PATHNAME__ = c.path
  globalThis.__TEST_PARAMS__ = c.params ?? {}

  let html = ''
  try {
    html = renderToStaticMarkup(
      React.createElement(
        AppContext.Provider,
        { value: context },
        React.createElement(ToastProvider, null, React.createElement(c.Component)),
      ),
    )
  } catch (err) {
    ok(`${c.name} 渲染不报错`, false, String(err?.stack ?? err).split('\n').slice(0, 3).join(' | '))
    console.log('')
    continue
  }

  ok(`${c.name} 渲染不报错`, true)
  ok(`${c.name} 渲染出了内容`, html.length > 200, `只有 ${html.length} 个字符`)

  // 同时搜正文和原始 HTML —— 表单里的初始值是 value="..." 属性，不算文本节点
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ')
  const haystack = text + '\u0000' + html
  const missing = c.must.filter((m) => !haystack.includes(m))
  ok(
    `${c.name} 内容正确（${c.must.length} 项）`,
    missing.length === 0,
    missing.length ? `缺少：${missing.join(' / ')}` : '',
  )
  console.log('')
}

/* -------------------------------------------------------- 无数据时的空状态 */

console.log('[空数据状态] 没有任何约会和灵感时，首页不应该崩')

globalThis.__TEST_PATHNAME__ = '/'
globalThis.__TEST_PARAMS__ = {}
const emptyContext = {
  ...context,
  dates: [],
  ideas: [],
  members: [snapshot.members[0]],
  partner: null,
  space: { ...snapshot.space, anniversary: null },
  stats: computeStats([], null),
}

try {
  const HomePage = require(join(TMP, 'app', 'page.js')).default
  const Html = renderToStaticMarkup(
    React.createElement(
      AppContext.Provider,
      { value: emptyContext },
      React.createElement(ToastProvider, null, React.createElement(HomePage)),
    ),
  )
  const text = Html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
  ok('空数据时首页不报错', true)
  ok('显示「还没有约会计划」', text.includes('还没有约会计划'))
  ok('提示对方还没加入', text.includes('Ta 还没有加入'))
  ok('天数显示为占位而不是 NaN', text.includes('—') && !text.includes('NaN'))
} catch (err) {
  ok('空数据时首页不报错', false, String(err?.stack ?? err).split('\n').slice(0, 3).join(' | '))
}

console.log('\n[空数据状态] 约会列表为空时不应该崩')
globalThis.__TEST_PATHNAME__ = '/dates'
try {
  const DatesPage = require(join(TMP, 'app', 'dates', 'page.js')).default
  const Html = renderToStaticMarkup(
    React.createElement(
      AppContext.Provider,
      { value: emptyContext },
      React.createElement(ToastProvider, null, React.createElement(DatesPage)),
    ),
  )
  ok('空数据时约会列表不报错', true)
  ok('显示「还没有约会记录」', Html.includes('还没有约会记录'))
} catch (err) {
  ok('空数据时约会列表不报错', false, String(err?.stack ?? err).split('\n').slice(0, 3).join(' | '))
}

console.log('\n[边界] 互动页在灵感清单为空时不应该崩')
globalThis.__TEST_PATHNAME__ = '/play'
try {
  const PlayPage = require(join(TMP, 'app', 'play', 'page.js')).default
  const Html = renderToStaticMarkup(
    React.createElement(
      AppContext.Provider,
      { value: emptyContext },
      React.createElement(ToastProvider, null, React.createElement(PlayPage)),
    ),
  )
  ok('空灵感清单时互动页不报错', true)
  ok('提示清单是空的', Html.includes('清单还是空的'))
  ok('抽签按钮被禁用', Html.includes('disabled'))
} catch (err) {
  ok('空灵感清单时互动页不报错', false, String(err?.stack ?? err).split('\n').slice(0, 3).join(' | '))
}

/* ------------------------------------------------------------------ 清理 */

rmSync(TMP, { recursive: true, force: true })

console.log('\n' + '='.repeat(64))
if (failures.length === 0) {
  console.log(`全部通过：${passed} 项检查 \u2713`)
} else {
  console.log(`通过 ${passed} 项，失败 ${failures.length} 项：`)
  failures.forEach((f) => console.log(`  · ${f}`))
}
process.exit(failures.length === 0 ? 0 : 1)
