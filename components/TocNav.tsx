'use client'

import { useEffect, useRef, useState } from 'react'
import type { TocItem } from '@/lib/content'

// 側欄目錄:偵測目前捲動到的章節、高亮並讓側欄跟著捲動
export default function TocNav({ toc }: { toc: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>(toc[0]?.id ?? '')
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({})

  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        let current = toc[0]?.id ?? ''
        for (const t of toc) {
          const el = document.getElementById(t.id)
          if (!el) continue
          if (el.getBoundingClientRect().top <= 120) current = t.id
          else break
        }
        setActiveId(current)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [toc])

  useEffect(() => {
    linkRefs.current[activeId]?.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  return (
    <nav className="space-y-1">
      {toc.map((t) => {
        const active = t.id === activeId
        return (
          <a
            key={t.id}
            href={`#${t.id}`}
            ref={(el) => { linkRefs.current[t.id] = el }}
            className={`block truncate rounded px-1.5 py-0.5 transition-colors ${
              active
                ? 'bg-sky-100 font-medium text-sky-700 dark:bg-sky-900/60 dark:text-sky-300'
                : t.depth === 1
                  ? 'font-medium hover:text-sky-600'
                  : 'pl-4 text-neutral-500 hover:text-sky-600 dark:text-neutral-400'
            } ${active && t.depth !== 1 ? 'pl-4' : ''}`}
          >
            {t.text}
          </a>
        )
      })}
    </nav>
  )
}
