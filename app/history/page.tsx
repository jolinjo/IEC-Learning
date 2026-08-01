'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TOPIC_NAMES } from '@/data/questions'

interface Record_ {
  date: string
  book: string
  score: number
  total: number
  weak: string[]
}

type Stats = Record<string, { right: number; wrong: number }>

const BOOK_NAMES: Record<string, string> = {
  all: '總檢定',
  C2: 'IEC 60617 符號',
  A1: 'IEC 81346-1 代號',
  A2: 'IEC 81346-2 選碼',
  C1: 'IEC 61082-1 圖面',
  B1: 'IEC 61355 文件',
  A3: 'IEC 60445 端子導線',
  A4: '線號合輯',
  D1: 'IEC 60204-1 安全',
}

export default function HistoryPage() {
  const [history, setHistory] = useState<Record_[]>([])
  const [stats, setStats] = useState<Stats>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem('iecq_history') ?? '[]'))
      setStats(JSON.parse(localStorage.getItem('iecq_stats') ?? '{}'))
    } catch {}
    setLoaded(true)
  }, [])

  const clearAll = () => {
    if (!confirm('確定要清除所有成績與弱點紀錄嗎?')) return
    localStorage.removeItem('iecq_history')
    localStorage.removeItem('iecq_stats')
    setHistory([])
    setStats({})
  }

  if (!loaded) return null

  const topicRows = Object.entries(stats)
    .map(([t, s]) => ({ t, ...s, rate: s.right / (s.right + s.wrong) }))
    .sort((a, b) => a.rate - b.rate)

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">成績紀錄</h1>
      <p className="mt-1 text-xs text-neutral-500">所有紀錄僅保存在此瀏覽器本機(localStorage),不會上傳。</p>

      {history.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-neutral-300 p-10 text-center text-neutral-500 dark:border-neutral-700">
          還沒有檢定紀錄。
          <Link href="/quiz/" className="ml-2 text-sky-600 underline">去考一場</Link>
        </div>
      ) : (
        <>
          <h2 className="mt-8 font-bold">歷次成績</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-300 text-left dark:border-neutral-700">
                  <th className="py-2 pr-4">日期</th>
                  <th className="py-2 pr-4">範圍</th>
                  <th className="py-2 pr-4">分數</th>
                  <th className="py-2">本次弱點</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((r, i) => (
                  <tr key={i} className="border-b border-neutral-200 dark:border-neutral-800">
                    <td className="py-2 pr-4 whitespace-nowrap">{new Date(r.date).toLocaleString('zh-TW', { hour12: false })}</td>
                    <td className="py-2 pr-4">{BOOK_NAMES[r.book] ?? r.book}</td>
                    <td className={`py-2 pr-4 font-bold ${r.score / r.total >= 0.8 ? 'text-green-600' : r.score / r.total >= 0.6 ? 'text-amber-600' : 'text-red-600'}`}>
                      {r.score}/{r.total}
                    </td>
                    <td className="py-2 text-neutral-500">{r.weak.map((t) => TOPIC_NAMES[t] ?? t).join('、') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {topicRows.length > 0 && (
            <>
              <h2 className="mt-10 font-bold">主題掌握度(依弱→強排序,弱主題出題機率較高)</h2>
              <div className="mt-3 space-y-2">
                {topicRows.map((r) => (
                  <div key={r.t} className="flex items-center gap-3 text-sm">
                    <span className="w-32 shrink-0 truncate">{TOPIC_NAMES[r.t] ?? r.t}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
                      <div
                        className={`h-full ${r.rate >= 0.8 ? 'bg-green-500' : r.rate >= 0.6 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.round(r.rate * 100)}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right text-neutral-500">
                      {Math.round(r.rate * 100)}%({r.right}/{r.right + r.wrong})
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <button onClick={clearAll} className="mt-10 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950">
            清除全部紀錄
          </button>
        </>
      )}
    </div>
  )
}
