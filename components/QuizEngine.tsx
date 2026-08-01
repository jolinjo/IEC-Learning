'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { QUESTIONS, TOPIC_NAMES, type Question } from '@/data/questions'

const QUIZ_SIZE = 20
const STATS_KEY = 'iecq_stats' // { [topic]: { right, wrong } }
const HISTORY_KEY = 'iecq_history' // [{ date, book, score, total, weak[] }]

type Stats = Record<string, { right: number; wrong: number }>

function loadStats(): Stats {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveStats(s: Stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(s))
}

/** 依弱點加權抽題:主題錯誤率越高,抽中權重越大(拉普拉斯平滑避免除零) */
function pickQuestions(book: string, stats: Stats): Question[] {
  const pool = book === 'all' ? [...QUESTIONS] : QUESTIONS.filter((q) => q.book === book)
  const weight = (q: Question) => {
    const s = stats[q.topic]
    const wrongRate = s ? (s.wrong + 1) / (s.right + s.wrong + 2) : 0.5
    return 0.5 + wrongRate * 2 // 全對的主題仍有基本權重,弱主題最高約 5 倍
  }
  const picked: Question[] = []
  const candidates = [...pool]
  while (picked.length < Math.min(QUIZ_SIZE, pool.length) && candidates.length) {
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

/** 選項洗牌並回傳新正解索引 */
function shuffleOptions(q: Question): { options: string[]; answer: number } {
  const order = q.options.map((_, i) => i).sort(() => Math.random() - 0.5)
  return { options: order.map((i) => q.options[i]), answer: order.indexOf(q.a) }
}

export default function QuizEngine({ book, title }: { book: string; title: string }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [shuffled, setShuffled] = useState<{ options: string[]; answer: number }[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [results, setResults] = useState<boolean[]>([])
  const [done, setDone] = useState(false)
  const [round, setRound] = useState(0)

  useEffect(() => {
    const qs = pickQuestions(book, loadStats())
    setQuestions(qs)
    setShuffled(qs.map(shuffleOptions))
    setCurrent(0)
    setSelected(null)
    setResults([])
    setDone(false)
  }, [book, round])

  const q = questions[current]
  const sh = shuffled[current]

  const choose = (i: number) => {
    if (selected !== null || !q || !sh) return
    setSelected(i)
    const correct = i === sh.answer
    setResults((r) => [...r, correct])
    const stats = loadStats()
    const s = stats[q.topic] ?? { right: 0, wrong: 0 }
    correct ? s.right++ : s.wrong++
    stats[q.topic] = s
    saveStats(stats)
  }

  const next = () => {
    if (current + 1 < questions.length) {
      setCurrent(current + 1)
      setSelected(null)
    } else {
      finish()
    }
  }

  const weakTopics = useMemo(() => {
    const byTopic: Record<string, { right: number; wrong: number }> = {}
    results.forEach((ok, i) => {
      const t = questions[i]?.topic
      if (!t) return
      byTopic[t] = byTopic[t] ?? { right: 0, wrong: 0 }
      ok ? byTopic[t].right++ : byTopic[t].wrong++
    })
    return Object.entries(byTopic)
      .filter(([, s]) => s.wrong > 0)
      .sort((a, b) => b[1].wrong - a[1].wrong)
  }, [results, questions])

  const finish = () => {
    setDone(true)
    const score = results.filter(Boolean).length
    try {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
      history.push({
        date: new Date().toISOString(),
        book,
        score,
        total: questions.length,
        weak: weakTopics.map(([t]) => t),
      })
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    } catch {
      /* 本機儲存不可用時僅略過紀錄 */
    }
  }

  if (!q || !sh) return <div className="py-20 text-center text-neutral-500">載入題目中…</div>

  if (done) {
    const score = results.filter(Boolean).length
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="mx-auto max-w-xl py-8 text-center">
        <h1 className="text-2xl font-bold">{title}|檢定結果</h1>
        <div className="mt-6 text-6xl font-bold text-sky-600">
          {score}<span className="text-2xl text-neutral-400"> / {questions.length}</span>
        </div>
        <div className="mt-2 text-neutral-500">{pct} 分{pct >= 80 ? ' 🎉 通過!' : pct >= 60 ? ',再加把勁' : ',建議回手冊複習'}</div>
        {weakTopics.length > 0 && (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-left text-sm dark:border-amber-800 dark:bg-amber-950">
            <div className="font-bold">📌 本次弱點主題(下次會加強出題)</div>
            <ul className="mt-2 list-disc pl-5">
              {weakTopics.map(([t, s]) => (
                <li key={t}>{TOPIC_NAMES[t] ?? t}:錯 {s.wrong} 題</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={() => setRound((r) => r + 1)} className="rounded-lg bg-sky-600 px-5 py-2 font-medium text-white hover:bg-sky-500">
            再考一次
          </button>
          <Link href="/history/" className="rounded-lg border border-neutral-300 px-5 py-2 font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
            成績紀錄
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
        <span>{title}</span>
        <span>
          第 {current + 1} / {questions.length} 題|答對 {results.filter(Boolean).length}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
        <div className="h-full bg-sky-500 transition-all" style={{ width: `${(current / questions.length) * 100}%` }} />
      </div>

      <h2 className="mt-6 text-lg font-bold leading-relaxed">{q.q}</h2>
      <div className="mt-1 text-xs text-neutral-400">主題:{TOPIC_NAMES[q.topic] ?? q.topic}</div>

      <div className="mt-4 space-y-2">
        {sh.options.map((opt, i) => {
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
              <span className="mr-2 font-mono text-neutral-400">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className={`mt-4 rounded-xl border p-4 text-sm ${correct ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950' : 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950'}`}>
          <div className="font-bold">{correct ? '✅ 答對了!' : `❌ 答錯了,正解是 ${String.fromCharCode(65 + sh.answer)}`}</div>
          <p className="mt-2 leading-relaxed">{q.ex}</p>
          <button onClick={next} className="mt-3 rounded-lg bg-sky-600 px-5 py-2 font-medium text-white hover:bg-sky-500">
            {current + 1 < questions.length ? '下一題 →' : '看總結'}
          </button>
        </div>
      )}
    </div>
  )
}
