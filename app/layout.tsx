import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'IEC 電氣製圖規範學習網',
  description: '從看懂圖到畫出正規圖——初學者的 IEC 電氣製圖規範教學與線上檢定',
}

const NAV = [
  { href: '/', label: '首頁' },
  { href: '/map/', label: '規範地圖' },
  { href: '/quiz/', label: '線上檢定' },
  { href: '/history/', label: '成績紀錄' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              ⚡ IEC 製圖學習網
            </Link>
            <nav className="flex gap-4 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mt-16 border-t border-neutral-200 py-8 text-center text-xs text-neutral-500 dark:border-neutral-800">
          本站為教學性整理,非 IEC 規範原文;正式設計請以 IEC 官方出版文件為準。符號圖形轉自
          <a href="https://qelectrotech.org" className="underline" target="_blank" rel="noopener"> QElectroTech </a>
          元件庫。
        </footer>
      </body>
    </html>
  )
}
