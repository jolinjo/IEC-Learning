'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { QUESTIONS, TOPIC_NAMES, type Question } from '@/data/questions'
import {
  MASTER_COUNT,
  currentUser,
  getProfile,
  recordAnswer,
  recordHistory,
  setCurrentUser,
  type QStat,
} from '@/lib/quizStore'

const QUIZ_SIZE = 20
const QUIZ_SIZE_ALL = 100 // 總檢定一場 100 題
const IMG_PREFIX = process.env.NODE_ENV === 'production' ? '/IEC-Learning/images/' : '/images/'

/** 依「未掌握優先」加權抽題:沒答對過 > 答對未滿3次 > 已掌握;答錯紀錄再加重 */
function pickQuestions(book: string, qstats: Record<string, QStat>): Question[] {
  const pool = book === 'all' ? [...QUESTIONS] : QUESTIONS.filter((q) => q.book === book)
  const size = book === 'all' ? QUIZ_SIZE_ALL : QUIZ_SIZE
  const weight = (q: Question) => {
    const s = qstats[q.id]
    if (!s) return 3 // 沒碰過的題優先
    if (s.r >= MASTER_COUNT) return 0.4 // 已掌握仍會偶爾複習
    return 1.5 + (MASTER_COUNT - s.r) * 0.5 + Math.min(s.w, 4) * 0.5
  }
  const picked: Question[] = []
  const candidates = [...pool]
  while (picked.length < Math.min(size, pool.length) && candidates.length) {
    const total = candidates.reduce((sum, q) => sum + weight(q), 0)
    let r = Math.random() * total
    let idx = 0
    for (let i = 0; i < candidates.length; i++) {
      r -= weight(candidates[i])
      if (r <= 0) {
        idx = i
        break
      }
    }
    picked.push(candidates.splice(idx, 1)[0])
  }
  return picked
}

function shuffleOptions(q: Question): { order: number[]; answer: number } {
  const order = q.options.map((_, i) => i).sort(() => Math.random() - 0.5)
  return { order, answer: order.indexOf(q.a) }
}

export default function QuizEngine({ book, title }: { book: string; title: string }) {
  const [user, setUser] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [ready, setReady] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [shuffled, setShuffled] = useState<{ order: number[]; answer: number }[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [results, setResults] = useState<boolean[]>([])
  const [done, setDone] = useState(false)
  const [round, setRound] = useState(0)

  useEffect(() => {
    setUser(currentUser())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!user) return
    const qstats = getProfile()?.qstats ?? {}
    const qs = pickQuestions(book, qstats)
    setQuestions(qs)
    setShuffled(qs.map(shuffleOptions))
    setCurrent(0)
    setSelected(null)
    setResults([])
    setDone(false)
  }, [book, round, user])

  const q = questions[current]
  const sh = shuffled[current]

  const weakOf = (res: boolean[]) => {
    const byTopic: Record<string, number> = {}
    res.forEach((ok, i) => {
      const t = questions[i]?.topic
      if (!t || ok) return
      byTopic[t] = (byTopic[t] ?? 0) + 1
    })
    return Object.entries(byTopic).sort((a, b) => b[1] - a[1])
  }

  const finishWith = (res: boolean[]) => {
    setDone(true)
    recordHistory({
      date: new Date().toISOString(),
      book,
      score: res.filter(Boolean).length,
      total: questions.length,
      weak: weakOf(res).map(([t]) => t),
    })
  }

  const advance = (res: boolean[]) => {
    if (current + 1 < questions.length) {
      setCurrent(current + 1)
      setSelected(null)
    } else {
      finishWith(res)
    }
  }

  const choose = (i: number) => {
    if (selected !== null || !q || !sh) return
    setSelected(i)
    const correct = i === sh.answer
    const newResults = [...results, correct]
    setResults(newResults)
    recordAnswer(q.id, correct)
    if (correct) {
      // 答對不打斷節奏:短暫顯示綠色後自動進下一題
      setTimeout(() => advance(newResults), 600)
    }
  }

  const next = () => advance(results)

  const weakTopics = useMemo(() => weakOf(results), [results, questions])

  if (!ready) return null

  // ===== 首次使用:填姓名(之後自動帶入) =====
  if (!user) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <h1 className="text-2xl font-bold">開始之前,你是哪位?</h1>
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
          填一次姓名,之後檢定會自動帶入。每題答對滿 {MASTER_COUNT} 次才算「掌握」,
          系統會依你的掌握狀況出題。成績只存在這台電腦的瀏覽器裡;
          多人共用電腦時,可在「成績紀錄」頁切換使用者或上傳/下載成績檔。
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const n = nameInput.trim()
            if (!n) return
            setCurrentUser(n)
            setUser(n)
          }}
          className="mt-6 flex justify-center gap-2"
        >
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="你的姓名或暱稱"
            className="w-52 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
            autoFocus
          />
          <button type="submit" className="rounded-lg bg-sky-600 px-5 py-2 font-medium text-white hover:bg-sky-500">
            開始
          </button>
        </form>
      </div>
    )
  }

  if (!q || !sh) return <div className="py-20 text-center text-neutral-500">載入題目中…</div>

  if (done) {
    const score = results.filter(Boolean).length
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="mx-auto max-w-xl py-8 text-center">
        <h1 className="text-2xl font-bold">{title} — 檢定結果</h1>
        <div className="mt-1 text-sm text-neutral-500">{user}</div>
        <div className="mt-6 text-6xl font-bold text-sky-600">
          {score}<span className="text-2xl text-neutral-400"> / {questions.length}</span>
        </div>
        <div className="mt-2 text-neutral-500">{pct} 分{pct >= 80 ? ' 🎉 表現不錯!' : pct >= 60 ? ',再加把勁' : ',建議回手冊複習'}</div>
        <p className="mt-2 text-xs text-neutral-400">
          提醒:單次分數不等於掌握——每題要在不同場次累積答對 {MASTER_COUNT} 次,才算真正掌握。
        </p>
        {weakTopics.length > 0 && (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-left text-sm dark:border-amber-800 dark:bg-amber-950">
            <div className="font-bold">📌 本次弱點主題(之後會加強出題)</div>
            <ul className="mt-2 list-disc pl-5">
              {weakTopics.map(([t, n]) => (
                <li key={t}>{TOPIC_NAMES[t] ?? t}:錯 {n} 題</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={() => setRound((r) => r + 1)} className="rounded-lg bg-sky-600 px-5 py-2 font-medium text-white hover:bg-sky-500">
            再考一次
          </button>
          <Link href="/history/" className="rounded-lg border border-neutral-300 px-5 py-2 font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
            看掌握度分析
          </Link>
        </div>
      </div>
    )
  }

  const answered = selected !== null
  const correct = answered && selected === sh.answer

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>{title} · 👤 {user}</span>
        <span>
          第 {current + 1} / {questions.length} 題 · 答對 {results.filter(Boolean).length}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
        <div className="h-full bg-sky-500 transition-all" style={{ width: `${(current / questions.length) * 100}%` }} />
      </div>

      <h2 className="mt-6 text-lg font-bold leading-relaxed">{q.q}</h2>
      <div className="mt-1 text-xs text-neutral-400">主題:{TOPIC_NAMES[q.topic] ?? q.topic}</div>

      {q.img && (
        <div className="mt-4 flex justify-center rounded-xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <img src={`${IMG_PREFIX}${q.img}`} alt="題目符號圖" className="max-h-36" />
        </div>
      )}

      <div className={`mt-4 ${q.optImgs ? 'grid grid-cols-2 gap-3' : 'space-y-2'}`}>
        {sh.order.map((orig, i) => {
          let cls = 'border-neutral-300 hover:border-sky-400 dark:border-neutral-700'
          if (answered) {
            if (i === sh.answer) cls = 'border-green-500 bg-green-50 dark:bg-green-950'
            else if (i === selected) cls = 'border-red-500 bg-red-50 dark:bg-red-950'
            else cls = 'border-neutral-200 opacity-60 dark:border-neutral-800'
          }
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={answered}
              className={`block w-full rounded-lg border px-4 py-3 text-left transition ${cls}`}
            >
              {q.optImgs ? (
                <span className="flex flex-col items-center gap-2">
                  <img src={`${IMG_PREFIX}${q.optImgs[orig]}`} alt="" className="max-h-24" />
                  <span className="text-xs text-neutral-400">
                    {String.fromCharCode(65 + i)}{answered ? `. ${q.options[orig]}` : ''}
                  </span>
                </span>
              ) : (
                <>
                  <span className="mr-2 font-mono text-neutral-400">{String.fromCharCode(65 + i)}.</span>
                  {q.options[orig]}
                </>
              )}
            </button>
          )
        })}
      </div>

      {answered && !correct && (
        <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm dark:border-red-800 dark:bg-red-950">
          <div className="font-bold">❌ 答錯了,正解是 {String.fromCharCode(65 + sh.answer)}</div>
          <p className="mt-2 leading-relaxed">{q.ex}</p>
          <button onClick={next} className="mt-3 rounded-lg bg-sky-600 px-5 py-2 font-medium text-white hover:bg-sky-500">
            {current + 1 < questions.length ? '下一題 →' : '看總結'}
          </button>
        </div>
      )}
    </div>
  )
}
