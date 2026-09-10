import type { Metadata, Viewport } from 'next'

import { AppFrame } from '@/components/AppFrame'
import { AppProvider } from '@/components/AppProvider'
import { ToastProvider } from '@/components/Toast'

import './globals.css'

export const metadata: Metadata = {
  title: '我们的小天地',
  description: '和喜欢的人，一起去喜欢的地方。',
  applicationName: '我们的小天地',
  appleWebApp: {
    capable: true,
    title: '我们的小天地',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFFBF8',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="app-bg min-h-dvh antialiased">
        <AppProvider>
          <ToastProvider>
            <AppFrame>{children}</AppFrame>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  )
}
