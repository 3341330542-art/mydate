# 我们的小天地 · 情侣约会空间

> 和喜欢的人，一起去喜欢的地方。

一个**只属于两个人**的私人约会小程序 / 网页应用。记录、规划、完成你们的每一次约会，
两个人的数据实时同步，换手机重新登录也还在。

手机浏览器打开就能用，可以「添加到主屏幕」当 App 使，也可以生成二维码发给对方扫。

---

## 目录

- [它长什么样](#它长什么样)
- [核心特性](#核心特性)
- [技术栈](#技术栈)
- [五分钟跑起来](#五分钟跑起来)
- [上线部署](#上线部署)
- [项目结构](#项目结构)
- [常用命令](#常用命令)
- [数据安全说明](#数据安全说明)
- [常见问题](#常见问题)

---

## 它长什么样

| 页面 | 内容 |
| --- | --- |
| **首页** | 浪漫文案、**下一次约会**大卡片 + 倒计时、我们的数据、近期安排 |
| **约会** | 待赴约 / 已完成 / 全部 三种视图，右下角悬浮按钮新建 |
| **约会详情** | 活动、日期时间、地点、花费、备注；编辑 / 删除 / 标记完成 |
| **互动** | 「今天想做什么」随机建议、**约会抽签**（带滚动动画）、灵感清单 |
| **我的** | 个人资料、空间设置、邀请码 + 二维码 + 邀请链接、数据统计、退出登录 |

设计上用的是米白 / 奶油 / 浅粉加少量红色强调，大圆角、柔和阴影、克制的微动画，
没有满屏爱心和玫瑰。

---

## 核心特性

**约会管理**
- 新建 / 查看 / 编辑 / 删除 / 标记为已完成
- 8 种活动类型：🍜 吃饭、🎬 看电影、☕️ 咖啡、🌳 散步、🎡 游玩、✈️ 旅行、🎁 惊喜、🤍 其他
- 预计花费、备注、可选的具体时间

**情侣互动**
- 「今天想做什么」：内置 30 条约会建议 + 你们自己添加的灵感，随机抽一条
- 「约会抽签」：两个人各自把想做的事写进清单，抽签决定（先快后慢的滚动动画 + 彩纸）
- 抽中结果可以一键「安排成一次约会」

**两个人的空间**
- 一个人创建空间 → 拿到邀请码 / 邀请链接 / 二维码 → 发给对方
- 对方打开链接，注册后自动进入同一个空间
- 一个空间最多 2 人，一个账号只能属于 1 个空间

**数据**
- 全部核心数据存在云端 PostgreSQL，**不是 localStorage**
- 两个人共享同一份数据，任何一方的新增 / 修改 / 删除都会实时同步给对方
- 回到前台时自动拉取最新数据，避免看到旧内容

**其它**
- 移动端优先，底部 Tab Bar，适配 iPhone 安全区域
- 兼容桌面浏览器（内容居中布局）
- 自动适配系统「减少动态效果」设置

---

## 技术栈

| 层 | 选型 | 为什么 |
| --- | --- | --- |
| 框架 | **Next.js 16**（App Router）+ **React 19** | 生态成熟，Vercel 一键部署 |
| 语言 | **TypeScript 5.9**（strict） | 类型安全，改起来不容易出错 |
| 样式 | **Tailwind CSS v4** | 设计令牌集中在 `globals.css`，改配色只改一个地方 |
| 数据库 | **Supabase**（PostgreSQL + Auth + Realtime） | 免费额度足够两个人用，自带行级权限和实时推送 |
| 部署 | **Vercel** | 免费、连 GitHub 后自动部署 |

**为什么数据库权限是安全的**：浏览器里只放了 Supabase 的 `anon` key，这是设计上公开的密钥。
真正的访问控制由数据库的**行级安全策略（RLS）**完成 —— 每个策略都要求
`couple_id = 当前登录用户所在的空间`，所以别人即使拿到 key 和链接，也读不到你们的数据。
这一条有自动化测试覆盖（见下面的 `npm run db:test`）。

---

## 五分钟跑起来

### 1. 装依赖

需要 Node.js 20.9 或更高版本。

```bash
npm install
```

### 2. 先看看界面（演示模式）

项目自带一个**演示模式**：不连数据库，用内置假数据预览完整界面。

```bash
cp .env.example .env.local       # Windows: copy .env.example .env.local
# 在 .env.local 里加一行：
# NEXT_PUBLIC_DEMO_MODE=1

npm run dev
```

打开 http://localhost:3000 就能看到首页、约会、互动、我的四个页面，
数据是假的，刷新会重置。

> 演示模式只是用来看效果的。正式使用请继续往下配置数据库。

### 3. 连上真实数据库

按 **[docs/部署教程.md](docs/部署教程.md)** 里的第 2 步创建 Supabase 项目并执行迁移脚本，
然后把你自己的 URL 和 key 填进 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

把 `NEXT_PUBLIC_DEMO_MODE` 删掉或设为 `0`，重启 `npm run dev` 即可。

> 只要填了 URL 和 key，程序会优先使用真实数据库，演示模式的开关会被忽略。

---

## 上线部署

完整的分步教程（含截图级的操作说明、二维码怎么生成、女朋友怎么加入、
以后怎么更新）在这里：

**👉 [docs/部署教程.md](docs/部署教程.md)**

一句话版本：

1. 在 [supabase.com](https://supabase.com) 免费建项目，把 `supabase/migrations/0001_init.sql` 粘进 SQL Editor 执行
2. 把代码推到 GitHub
3. 在 [vercel.com](https://vercel.com) 导入这个仓库，填两个环境变量
4. 部署完成，拿到 `https://xxx.vercel.app` 链接
5. 用这个链接生成二维码发给对方

---

## 项目结构

```
约会小程序/
├─ src/
│  ├─ app/                          # 页面（App Router）
│  │  ├─ layout.tsx                 # 根布局：注入 Provider 和 AppFrame
│  │  ├─ globals.css                # ★ 设计系统：配色 / 圆角 / 阴影 / 动画都在这里
│  │  ├─ page.tsx                   # 首页
│  │  ├─ login/                     # 登录 / 注册
│  │  ├─ join/                      # 邀请链接落地页（?code=XXXXXX）
│  │  ├─ welcome/                   # 创建情侣空间 / 输入邀请码
│  │  ├─ dates/                     # 约会列表、新建、详情、编辑
│  │  ├─ play/                      # 互动：随机建议 + 抽签
│  │  └─ me/                        # 我的：资料、邀请、统计
│  ├─ components/
│  │  ├─ AppProvider.tsx            # ★ 全局状态：启动流程 / 实时订阅 / 所有写操作
│  │  ├─ AppFrame.tsx               # 路由守卫 + 加载动画 + 错误页
│  │  ├─ TabBar.tsx                 # 底部导航
│  │  ├─ ui.tsx                     # 通用组件：按钮 / 输入 / 底部弹层 / 空状态
│  │  ├─ DateCard.tsx               # 约会卡片
│  │  ├─ NextDateHero.tsx           # 下一次约会 + 倒计时
│  │  ├─ DateForm.tsx               # 新建 / 编辑表单
│  │  ├─ InvitePanel.tsx            # 邀请码 + 二维码 + 分享
│  │  ├─ QrCode.tsx                 # 浏览器内生成二维码
│  │  ├─ AuthForm.tsx               # 登录 / 注册表单
│  │  ├─ Confetti.tsx               # 完成 / 中签时的彩纸动效
│  │  ├─ Toast.tsx                  # 轻提示
│  │  └─ Icons.tsx                  # 内联 SVG 图标
│  └─ lib/
│     ├─ config.ts                  # 环境变量读取
│     ├─ types.ts                   # 领域模型
│     ├─ datetime.ts                # 日期 / 倒计时（有单元测试）
│     ├─ selectors.ts               # 下一次约会 / 分组 / 统计（有单元测试）
│     ├─ activities.ts              # 8 种活动类型
│     ├─ ideas-builtin.ts           # 30 条内置约会建议
│     ├─ errors.ts                  # 统一错误码 → 中文提示
│     ├─ clipboard.ts               # 复制 / 系统分享
│     └─ data/                      # ★ 数据访问层
│        ├─ provider.ts             #   统一接口（UI 只依赖它）
│        ├─ supabase-provider.ts    #   正式实现：云端数据库
│        ├─ demo-provider.ts        #   演示实现：内存假数据
│        └─ index.ts                #   按环境变量选择实现
├─ supabase/migrations/0001_init.sql # ★ 数据库：建表 + RLS + RPC + 触发器 + 实时
├─ scripts/
│  ├─ db-test.mjs                   # 数据库自测（30 项：迁移 + 权限隔离）
│  ├─ logic-test.mjs                # 日期与统计逻辑自测（51 项）
│  ├─ render-test.mjs               # 页面渲染自测（45 项：12 个页面 + 边界情况）
│  └─ qr.mjs                        # 邀请二维码生成
├─ docs/部署教程.md                  # ★ 完整上线教程
└─ .env.example                     # 环境变量模板
```

**想换后端？** 只需要照着 `src/lib/data/provider.ts` 的接口再写一个实现，
在 `src/lib/data/index.ts` 里选一下就行，UI 一行都不用改。

**想换配色？** 改 `src/app/globals.css` 顶部的 `@theme` 区块即可。

---

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 本地开发（http://localhost:3000） |
| `npm run build` | 生产构建 |
| `npm start` | 本地跑生产版本 |
| `npm test` | **一次跑完下面所有自测** |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run db:test` | **数据库自测**：用 WASM 版真 PostgreSQL 执行迁移脚本，验证建表、邀请码流程、RLS 权限隔离（30 项） |
| `npm run logic:test` | **逻辑自测**：倒计时文案、下一次约会选择、分组、统计（51 项） |
| `npm run render:test` | **渲染自测**：用真正的 React 渲染全部 12 个页面，检查有没有运行时崩溃、内容对不对（45 项） |
| `npm run qr -- <链接>` | 把邀请链接生成二维码图片 |

这三个自测都**不需要联网、不碰真实数据库、不需要浏览器**，改完代码随手跑一下很有用。

```
$ npm run db:test
  ...
  ✓ A 只看得到自己空间的数据
  ✓ B 只看得到自己空间的数据
  ✓ 未登录用户读不到任何约会
      （拦截方式：permission denied for table dates）
  ✓ 不能往别人的空间里写数据
  ✓ 看不到其他空间成员的资料
  ✓ 不能绕过 RPC 直接插入情侣空间
  ...
  全部通过：30 项检查 ✓
```

---

## 数据安全说明

| 项目 | 说明 |
| --- | --- |
| 前端能看到的密钥 | 只有 Supabase `anon` key，这是设计上公开的 |
| 谁能读到你们的数据 | 只有登录后、且与你在同一个情侣空间的账号 |
| 陌生人拿到 anon key 能做什么 | 什么都读不到，RLS 会拒绝所有查询 |
| 陌生人拿到邀请链接能做什么 | 只能看到空间名字，加入不了已满员的空间 |
| 绝对不要提交的东西 | `service_role` key、数据库密码、`.env.local` |
| 密码怎么存 | 由 Supabase Auth 用 bcrypt 加盐哈希，数据库里看不到明文 |

`.gitignore` 已经排除了 `.env*.local`、`.env.production`、`node_modules`、`.next`，可以放心 `git add .`。

---

## 常见问题

**Q：能在微信里直接打开吗？**
可以，链接发到微信里点开就是手机浏览器打开网页。想要更像 App，可以在 Safari / Chrome 里
「添加到主屏幕」，就有独立图标和全屏体验了。

**Q：一个空间能装三个人吗？**
不能，数据库层面就限制了最多 2 人，这是刻意的。

**Q：女朋友需要装什么吗？**
什么都不用装，打开链接 → 填邮箱和密码注册 → 自动进入你们的空间。

**Q：Supabase 免费额度够用吗？**
两个人的约会记录，数据库大概几百 KB，免费版 500 MB 完全够。唯一要注意的是免费项目
**连续 7 天没有任何数据库活动会被自动暂停**（[官方说明](https://supabase.com/docs/guides/platform/free-project-pausing)），
暂停后在控制台点一下 **Resume project** 就能恢复，数据不会丢。你们平时用着就不会触发。

**Q：想改「在一起的日子」/ 空间名字 / 首页文案？**
「我的」页面里点一下就能改，两个人谁改都行。

**Q：怎么看两个人是不是真的同步了？**
用你的手机和她的手机各开一个，一边新建一个约会，另一边一两秒内就会出现。
底部没有刷新按钮，但切回前台会自动拉最新数据。

**Q：本地跑起来只看到一个「还差一步：连接数据库」的页面？**
说明还没有配置 `.env.local`。要么按提示填 Supabase 的 URL 和 key，
要么临时加一行 `NEXT_PUBLIC_DEMO_MODE=1` 先看界面。
