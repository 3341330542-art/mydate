/**
 * 邀请二维码生成脚本
 * ============================================================================
 * 用法：
 *
 *   node scripts/qr.mjs https://your-app.vercel.app/join?code=ABC123
 *   npm run qr -- https://your-app.vercel.app/join?code=ABC123
 *
 * 会在 qrcodes/ 目录下生成一张 PNG，同时在终端里打印一个可以直接用手机扫的字符画。
 *
 * 小提示：小程序「我的」页面里本来就有二维码，可以直接截图发给对方；
 * 这个脚本适合想把二维码存成图片、打印出来或者放到别的地方的场景。
 */
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import QRCode from 'qrcode'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'qrcodes')

const url = process.argv[2]

if (!url) {
  console.error(`
用法：node scripts/qr.mjs <邀请链接>

例如：
  node scripts/qr.mjs https://our-dates.vercel.app/join?code=AB3D7K
  npm run qr -- https://our-dates.vercel.app/join?code=AB3D7K

邀请链接可以在小程序的「我的 → 邀请另一半」里复制。`)
  process.exit(1)
}

if (!/^https?:\/\//i.test(url)) {
  console.error('请把完整的链接传进来（要以 http:// 或 https:// 开头）')
  process.exit(1)
}

mkdirSync(OUT_DIR, { recursive: true })

const safeName = url.replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '_').slice(0, 80)
const pngPath = join(OUT_DIR, `${safeName}.png`)

await QRCode.toFile(pngPath, url, {
  width: 1024,
  margin: 2,
  errorCorrectionLevel: 'M',
  color: { dark: '#2C2429', light: '#FFFFFF' },
})

const ascii = await QRCode.toString(url, { type: 'terminal', small: true })

console.log('\n邀请链接：', url)
console.log('二维码图片：', pngPath)
console.log('\n用手机相机扫下面这个码就能直接打开：\n')
console.log(ascii)
