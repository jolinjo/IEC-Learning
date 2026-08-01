'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { TOPIC_NAMES } from '@/data/questions'
import {
  LAYERS,
  MASTER_COUNT,
  currentUser,
  exportProfile,
  getProfile,
  importProfile,
  levelOf,
  listUsers,
  masteryOf,
  setCurrentUser,
  type Profile,
} from '@/lib/quizStore'

const BOOK_NAMES: Record<string, string> = {
  all: '總檢定',
  A1: '81346-1 代號',
  A2: '81346-2 選碼',
  A3: '60445 端子導線',
  A4: '線號合輯',
  B1: '61355 文件',
  C1: '61082-1 圖面',
  C2: '60617 符號',
  C3: '81714-2 符號設計',
  D1: '60204-1 安全',
}

function LevelBadge({ ratio }: { ratio: number }) {
  const lv = levelOf(ratio)
  return <span className={`font-bold ${lv.color}`}>{lv.label}</span>
}

function MasteryBar({ mastered, inProgress, total }: { mastered: number; inProgress: number; total: number }) {
  const mPct = total ? (mastered / total) * 100 : 0
  const pPct = total ? (inProgress / total) * 100 : 0
  return (
    <div className="h-3 flex-1 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
      <div className="flex h-full">
        <div className="bg-green-500" style={{ width: `${mPct}%` }} />
        <div className="bg-amber-400" style={{ width: `${pPct}%` }} />
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [users, setUsers] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const reload = () => {
    setProfile(getProfile())
    setUsers(listUsers())
  }

  useEffect(() => {
    reload()
    setLoaded(true)
  }, [])

  const download = () => {
    const json = exportProfile()
    if (!json || !profile) return
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `IEC-Learning_成績_${profile.name}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const upload = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const res = importProfile(String(reader.result))
      setMsg(res.msg)
      reload()
    }
    reader.readAsText(file)
  }

  const switchUser = (name: string) => {
    if (name === '__new__') {
      const n = prompt('輸入新使用者的姓名或暱稱:')?.trim()
      if (n) setCurrentUser(n)
    } else {
      setCurrentUser(name)
    }
    reload()
  }

  if (!loaded) return null

  const qstats = profile?.qstats ?? {}
  const overall = masteryOf(qstats)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">掌握度與成績</h1>
          <p className="mt-1 text-xs text-neutral-500">
            每題在不同場次累積答對 {MASTER_COUNT} 次=掌握該題。紀錄僅存於此瀏覽器,可下載備份或帶到別台電腦上傳。
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <select
            value={profile?.name ?? ''}
            onChange={(e) => switchUser(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {!profile && <option value="">(尚未設定使用者)</option>}
            {users.map((u) => (
              <option key={u} value={u}>👤 {u}</option>
            ))}
            <option value="__new__">＋ 新使用者…</option>
          </select>
          <button onClick={download} disabled={!profile} className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800">
            ⬇ 下載成績
          </button>
          <button onClick={() => fileRef.current?.click()} className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
            ⬆ 上傳成績
          </button>
          <input ref={fileRef} type="file" accept=".json" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
      </div>
      {msg && <div className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800 dark:bg-sky-950 dark:text-sky-200">{msg}</div>}

      {!profile ? (
        <div className="mt-10 rounded-xl border border-dashed border-neutral-300 p-10 text-center text-neutral-500 dark:border-neutral-700">
          還沒有任何紀錄。<Link href="/quiz/" className="ml-2 text-sky-600 underline">去考第一場</Link>,系統會請你填一次姓名。
        </div>
      ) : (
        <>
          {/* 總體等級 */}
          <div className="mt-6 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-neutral-500">{profile.name} 的總體程度</div>
                <div className="mt-1 text-3xl font-bold"><LevelBadge ratio={overall.ratio} /></div>
              </div>
              <div className="text-right text-sm text-neutral-500">
                已掌握 <span className="font-bold text-green-600">{overall.mastered}</span> / {overall.total} 題
                <div className="text-xs">(答對過未滿 {MASTER_COUNT} 次:{overall.inProgress} 題)</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <MasteryBar {...overall} />
              <span className="w-12 text-right text-sm text-neutral-500">{Math.round(overall.ratio * 100)}%</span>
            </div>
            <div className="mt-2 text-xs text-neutral-400">
              等級門檻:掌握 ⅓ 題庫=入門、⅔=熟練、全部=專家。
              <span className="ml-2 inline-block h-2 w-2 rounded-sm bg-green-500 align-middle" /> 已掌握
              <span className="ml-2 inline-block h-2 w-2 rounded-sm bg-amber-400 align-middle" /> 進行中
            </div>
          </div>

          {/* A–D 層級儀表 */}
          <h2 className="mt-8 font-bold">四層架構掌握度(對應規範地圖 A–D)</h2>
          <div className="mt-3 space-y-4">
            {LAYERS.map((L) => {
              const m = masteryOf(qstats, L.books)
              return (
                <div key={L.key} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-bold">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-600 font-mono text-xs text-white">{L.key}</span>
                      {L.name}
                    </span>
                    <span>
                      <LevelBadge ratio={m.ratio} />
                      <span className="ml-2 text-neutral-500">{m.mastered}/{m.total} 題</span>
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <MasteryBar {...m} />
                    <span className="w-12 text-right text-xs text-neutral-500">{Math.round(m.ratio * 100)}%</span>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-neutral-500 sm:grid-cols-2">
                    {L.books.map((b) => {
                      const bm = masteryOf(qstats, [b])
                      return (
                        <div key={b} className="flex justify-between">
                          <span>{BOOK_NAMES[b]}</span>
                          <span>{bm.mastered}/{bm.total} 題 · <LevelBadge ratio={bm.ratio} /></span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 歷次成績 */}
          {profile.history.length > 0 && (
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
                    {[...profile.history].reverse().map((r, i) => (
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
            </>
          )}
        </>
      )}
    </div>
  )
}
