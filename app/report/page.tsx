'use client'

// 成績彙整(主管用):一次讀入多份同仁下載的成績 JSON,純前端統計,不上傳任何資料
import React, { useRef, useState } from 'react'
import { QUESTIONS, TOPIC_NAMES } from '@/data/questions'
import { LAYERS, RADAR_AXES, MASTER_COUNT, levelOf, masteryOf, type Profile } from '@/lib/quizStore'

interface Row {
  profile: Profile
  fileName: string
}

const BOOK_NAMES: Record<string, string> = {
  all: '總檢定',
  A1: 'A1 · 81346-1 代號',
  A2: 'A2 · 81346-2 選碼',
  A3: 'A3 · 60445 端子導線',
  A4: 'A4 · 線號合輯',
  B1: 'B1 · 61355 文件',
  C1: 'C1 · 61082-1 圖面',
  C2: 'C2 · 60617 符號',
  C3: 'C3 · 81714-2 符號設計',
  D1: 'D1 · 60204-1 安全',
}

export default function ReportPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  const toggleExpand = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const addFiles = async (files: FileList) => {
    const next: Row[] = []
    const errs: string[] = []
    for (const f of Array.from(files)) {
      try {
        const data = JSON.parse(await f.text())
        const p: Profile = data.profile ?? data
        if (!p?.name || typeof p.qstats !== 'object') throw new Error()
        next.push({ profile: p, fileName: f.name })
      } catch {
        errs.push(f.name)
      }
    }
    setRows((prev) => {
      // 同名以較新檔案覆蓋
      const merged = new Map(prev.map((r) => [r.profile.name, r]))
      next.forEach((r) => merged.set(r.profile.name, r))
      return [...merged.values()]
    })
    setErrors(errs)
  }

  const exportCsv = () => {
    const head = ['姓名', '總掌握題數', `題庫總數`, '掌握率%', '等級', ...RADAR_AXES.map((a) => `${a.name}%`), '檢定場次', '最後作答']
    const lines = rows.map(({ profile: p }) => {
      const o = masteryOf(p.qstats)
      const last = p.history.length ? new Date(p.history[p.history.length - 1].date).toLocaleString('zh-TW', { hour12: false }) : ''
      return [
        p.name, o.mastered, o.total, Math.round(o.ratio * 100), levelOf(o.ratio).label,
        ...RADAR_AXES.map((a) => Math.round(masteryOf(p.qstats, a.books).ratio * 100)),
        p.history.length, last,
      ].join(',')
    })
    const blob = new Blob(['﻿' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `IEC-Learning_全員成績_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">成績彙整(主管用)</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        請同仁在「成績紀錄」頁下載各自的成績檔(JSON),收齊後在這裡一次選入,
        立即得到全員掌握度總表——所有計算都在你的瀏覽器完成,不會上傳到任何伺服器。
        每題累積答對 {MASTER_COUNT} 次=掌握;等級門檻:⅓ 入門、⅔ 熟練、全部專家。
      </p>

      <div className="mt-5 flex gap-3">
        <button onClick={() => fileRef.current?.click()} className="rounded-lg bg-sky-600 px-5 py-2 font-medium text-white hover:bg-sky-500">
          📂 選擇成績檔(可多選)
        </button>
        {rows.length > 0 && (
          <button onClick={exportCsv} className="rounded-lg border border-neutral-300 px-5 py-2 font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
            ⬇ 匯出 CSV(Excel)
          </button>
        )}
        <input ref={fileRef} type="file" accept=".json" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
      </div>
      {errors.length > 0 && (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          無法解析:{errors.join('、')}(不是有效的成績檔)
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-300 text-left dark:border-neutral-700">
                <th className="py-2 pr-3">姓名</th>
                <th className="py-2 pr-3">總掌握</th>
                <th className="py-2 pr-3">等級</th>
                {RADAR_AXES.map((a) => (
                  <th key={a.key} className="py-2 pr-3">{a.name}</th>
                ))}
                <th className="py-2 pr-3">場次</th>
                <th className="py-2">最後作答</th>
              </tr>
            </thead>
            <tbody>
              {[...rows]
                .sort((a, b) => masteryOf(b.profile.qstats).ratio - masteryOf(a.profile.qstats).ratio)
                .map(({ profile: p }) => {
                  const o = masteryOf(p.qstats)
                  const lv = levelOf(o.ratio)
                  const last = p.history.length ? new Date(p.history[p.history.length - 1].date) : null
                  const open = expanded.has(p.name)
                  return (
                    <React.Fragment key={p.name}>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800">
                      <td className="py-2 pr-3 font-medium">{p.name}</td>
                      <td className="py-2 pr-3 tabular-nums">
                        {o.mastered}/{o.total}
                        <span className="ml-1 text-xs text-neutral-400">({Math.round(o.ratio * 100)}%)</span>
                      </td>
                      <td className={`py-2 pr-3 font-bold ${lv.color}`}>{lv.label}</td>
                      {RADAR_AXES.map((a) => {
                        const m = masteryOf(p.qstats, a.books)
                        const alv = levelOf(m.ratio)
                        return (
                          <td key={a.key} className="py-2 pr-3 tabular-nums">
                            {Math.round(m.ratio * 100)}%
                            <span className={`ml-1 text-xs ${alv.color}`}>{alv.label}</span>
                          </td>
                        )
                      })}
                      <td className="py-2 pr-3 tabular-nums">
                        {p.history.length > 0 ? (
                          <button
                            onClick={() => toggleExpand(p.name)}
                            className="rounded px-1.5 py-0.5 text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950"
                            title={open ? '收合場次明細' : '展開場次明細'}
                          >
                            {p.history.length} {open ? '▾' : '▸'}
                          </button>
                        ) : (
                          0
                        )}
                      </td>
                      <td className="py-2 text-xs text-neutral-500">{last ? last.toLocaleString('zh-TW', { hour12: false }) : '—'}</td>
                    </tr>
                    {open && (
                      <tr className="border-b border-neutral-200 dark:border-neutral-800">
                        <td colSpan={6 + RADAR_AXES.length} className="bg-neutral-50 px-4 py-3 dark:bg-neutral-900">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-neutral-300 text-left text-neutral-500 dark:border-neutral-700">
                                <th className="py-1.5 pr-4">#</th>
                                <th className="py-1.5 pr-4">時間</th>
                                <th className="py-1.5 pr-4">範圍</th>
                                <th className="py-1.5 pr-4">分數</th>
                                <th className="py-1.5">本次弱點</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const recs = [...p.history].reverse().map((r, i) => ({ r, no: p.history.length - i }))
                                const groups: { day: string; items: typeof recs }[] = []
                                for (const it of recs) {
                                  const day = new Date(it.r.date).toLocaleDateString('zh-TW')
                                  const g = groups[groups.length - 1]
                                  if (g && g.day === day) g.items.push(it)
                                  else groups.push({ day, items: [it] })
                                }
                                return groups.map((g) => (
                                  <React.Fragment key={g.day}>
                                    <tr className="border-b border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
                                      <td colSpan={5} className="py-1.5 pr-4 font-bold">
                                        📅 {g.day}
                                        <span className="ml-2 font-normal text-neutral-400">{g.items.length} 場</span>
                                      </td>
                                    </tr>
                                    {g.items.map(({ r, no }) => (
                                      <tr key={no} className="border-b border-neutral-200 last:border-0 dark:border-neutral-800">
                                        <td className="py-1.5 pr-4 text-neutral-400">{no}</td>
                                        <td className="py-1.5 pr-4 whitespace-nowrap tabular-nums">{new Date(r.date).toLocaleTimeString('zh-TW', { hour12: false })}</td>
                                        <td className="py-1.5 pr-4">{BOOK_NAMES[r.book] ?? r.book}</td>
                                        <td className={`py-1.5 pr-4 font-bold tabular-nums ${r.score / r.total >= 0.8 ? 'text-green-600' : r.score / r.total >= 0.6 ? 'text-amber-600' : 'text-red-600'}`}>
                                          {r.score}/{r.total}
                                        </td>
                                        <td className="py-1.5 text-neutral-500">{r.weak.map((t) => TOPIC_NAMES[t] ?? t).join('、') || '—'}</td>
                                      </tr>
                                    ))}
                                  </React.Fragment>
                                ))
                              })()}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  )
                })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-neutral-400">
            共 {rows.length} 人|題庫 {QUESTIONS.length} 題|同名檔案以後選入者為準|離開頁面即清空,不留任何資料
          </p>
        </div>
      )}
    </div>
  )
}
