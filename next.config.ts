import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // 把工程根目录固定为本项目目录。
  // 父目录 D:\毕设项目 下也存在 package-lock.json，不固定的话 Next 会误判工作区根目录。
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingRoot: process.cwd(),
}

export default nextConfig
