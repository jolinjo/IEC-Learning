'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { QUESTIONS, TOPIC_NAMES, type Question } from '@/data/questions'
import { HANDBOOKS, STAGES } from '@/lib/handbooks'

const BOOK_META = new Map(HANDBOOKS.map((h) => [h.slug, h]))
const STAGE_TAG = new Map(STAGES.map((st) => [st.stage, st.name.split('|')[0]]))
import {
  MASTER_COUNT,
  currentUser,
  flagReview,
  getProfile,
  recordAnswer,
  recordHistory,
  setCurrentUser,
  unflagReview,
  type QStat,
} from '@/lib/quizStore'

const QUIZ_SIZE = 20
const QUIZ_SIZE_ALL = 100 // 總檢定一場 100 題
const IMG_PREFIX = process.env.NODE_ENV === 'production' ? '/IEC-Learning/images/' : '/images/'
const SEC_PREFIX = process.env.NODE_ENV === 'production' ? '/IEC-Learning/sections/' : '/sections/'

// ===== 「完全沒印象」:出處段落比對 =====
interface Section { t: string; md: string }
const sectionCache: Record<string, Section[]> = {}

async function loadSections(book: string): Promise<Section[]> {
  if (!sectionCache[book]) {
    const res = await fetch(`${SEC_PREFIX}${book}.json`)
    sectionCache[book] = res.ok ? await res.json() : []
  }
  return sectionCache[book]
}

/** 從題目文字抽關鍵詞(中文二字詞+英數 token),對各段落計分找最相關出處 */
function bestSection(secs: Section[], text: string): Section | null {
  if (!secs.length) return null
  const terms = new Set<string>()
  for (const m of text.matchAll(/[A-Za-z0-9+&.-]{2,}/g)) terms.add(m[0].toLowerCase())
  const cjk = text.replace(/[^一-鿿]/g, ' ')
  for (const w of cjk.split(/\s+/)) {
    for (let i = 0; i + 2 <= w.length; i++) terms.add(w.slice(i, i + 2))
  }
  let best: Section | null = null
  let bestScore = 0
  for (const sec of secs) {
    const lower = sec.md.toLowerCase()
    let score = 0
    for (const t of terms) {
      let cnt = 0
      let pos = lower.indexOf(t)
      while (pos !== -1 && cnt < 3) {
        cnt++
        pos = lower.indexOf(t, pos + t.length)
      }
      score += cnt * (t.length >= 3 ? 2 : 1)
    }
    score /= Math.sqrt(sec.md.length + 200) // 避免長段落靠篇幅堆分
    if (score > bestScore) {
      bestScore = score
      best = sec
    }
  }
  return best
}

/** 依「未掌握優先」加權抽題:沒答對過 > 答對未滿3次 > 已掌握;答錯紀錄再加重 */
function pickQuestions(book: string, qstats: Record<string, QStat>, review: Set<string>): Question[] {
  const pool = book === 'all' ? [...QUESTIONS] : QUESTIONS.filter((q) => q.book === book)
  const size = book === 'all' ? QUIZ_SIZE_ALL : QUIZ_SIZE
  const weight = (q: Question) => {
    if (review.has(q.id)) return 6 // 上次按「完全沒印象」的題,最優先再出
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
  const [results, setResults] = useState<(boolean | null)[]>([])
  const [done, setDone] = useState(false)
  const [round, setRound] = useState(0)
  const [src, setSrc] = useState<{ title: string; md: string } | null>(null)
  const [srcOpen, setSrcOpen] = useState(false)

  useEffect(() => {
    setUser(currentUser())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!user) return
    const prof = getProfile()
    const qs = pickQuestions(book, prof?.qstats ?? {}, new Set(prof?.review ?? []))
    setQuestions(qs)
    setShuffled(qs.map(shuffleOptions))
    setCurrent(0)
    setSelected(null)
    setResults([])
    setDone(false)
  }, [book, round, user])

  const q = questions[current]
  const sh = shuffled[current]

  const weakOf = (res: (boolean | null)[]) => {
    const byTopic: Record<string, number> = {}
    res.forEach((ok, i) => {
      const t = questions[i]?.topic
      if (!t || ok !== false) return
      byTopic[t] = (byTopic[t] ?? 0) + 1
    })
    return Object.entries(byTopic).sort((a, b) => b[1] - a[1])
  }

  const finishWith = (res: (boolean | null)[]) => {
    setDone(true)
    recordHistory({
      date: new Date().toISOString(),
      book,
      score: res.filter((x) => x === true).length,
      total: res.filter((x) => x !== null).length, // 「沒印象」跳過的題不計分
      weak: weakOf(res).map(([t]) => t),
    })
  }

  const advance = (res: (boolean | null)[]) => {
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
    unflagReview(q.id) // 之前標過「沒印象」的題,這次考過了就解除旗標
    if (correct) {
      // 答對不打斷節奏:短暫顯示綠色後自動進下一題
      setTimeout(() => advance(newResults), 600)
    }
  }

  const next = () => advance(results)

  // 「完全沒印象」:不計分、標記下次優先出題、顯示手冊出處段落原稿
  const noIdea = async () => {
    if (selected !== null || !q) return
    flagReview(q.id)
    setResults([...results, null])
    setSrc(null)
    setSrcOpen(true)
    const secs = await loadSections(q.book)
    const hit = bestSection(secs, `${q.q} ${q.options[q.a]} ${q.ex}`)
    const h = BOOK_META.get(q.book)
    setSrc(hit
      ? { title: `${h?.slug ?? q.book} ${h?.title ?? ''} · ${hit.t}`, md: hit.md.trim() }
      : { title: `${h?.slug ?? q.book} ${h?.title ?? ''}`, md: '(找不到對應段落,請直接開啟手冊複習)' })
  }

  const closeSrc = () => {
    setSrcOpen(false)
    advance(results.length > 0 && results[results.length - 1] === null ? results : [...results, null])
  }

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
    const score = results.filter((x) => x === true).length
    const answeredTotal = results.filter((x) => x !== null).length
    const skipped = results.filter((x) => x === null).length
    const pct = answeredTotal ? Math.round((score / answeredTotal) * 100) : 0
    return (
      <div className="mx-auto max-w-xl py-8 text-center">
        <h1 className="text-2xl font-bold">{title} — 檢定結果</h1>
        <div className="mt-1 text-sm text-neutral-500">{user}</div>
        <div className="mt-6 text-6xl font-bold text-sky-600">
          {score}<span className="text-2xl text-neutral-400"> / {answeredTotal}</span>
        </div>
        <div className="mt-2 text-neutral-500">{pct} 分{pct >= 80 ? ' 🎉 表現不錯!' : pct >= 60 ? ',再加把勁' : ',建議回手冊複習'}</div>
        <p className="mt-2 text-xs text-neutral-400">
          提醒:單次分數不等於掌握——每題要在不同場次累積答對 {MASTER_COUNT} 次,才算真正掌握。
        </p>
        {skipped > 0 && (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            🤷 本次「完全沒印象」跳過 {skipped} 題(不計分),已列入下次檢定優先出題。
          </p>
        )}
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
          第 {current + 1} / {questions.length} 題 · 答對 {results.filter((x) => x === true).length}
          {results.filter((x) => x === null).length > 0 && ` · 沒印象 ${results.filter((x) => x === null).length}`}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
        <div className="h-full bg-sky-500 transition-all" style={{ width: `${(current / questions.length) * 100}%` }} />
      </div>

      <h2 className="mt-6 text-lg font-bold leading-relaxed">{q.q}</h2>
      <div className="mt-1 text-xs text-neutral-400">
        主題:{TOPIC_NAMES[q.topic] ?? q.topic}
        {(() => {
          const h = BOOK_META.get(q.book)
          return h ? ` ｜ ${h.slug} ${h.title} ｜ 第 ${h.stage} 階段(${STAGE_TAG.get(h.stage)})` : ''
        })()}
      </div>

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

      {!answered && (
        <div className="mt-4 text-center">
          <button
            onClick={noIdea}
            className="rounded-lg border border-dashed border-neutral-300 px-4 py-2 text-sm text-neutral-500 hover:border-amber-400 hover:text-amber-600 dark:border-neutral-700 dark:hover:border-amber-600 dark:hover:text-amber-400"
          >
            🤷 完全沒印象——看出處段落複習(本題不計分,下次再考)
          </button>
        </div>
      )}

      {answered && !correct && (
        <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm dark:border-red-800 dark:bg-red-950">
          <div className="font-bold">❌ 答錯了,正解是 {String.fromCharCode(65 + sh.answer)}</div>
          <p className="mt-2 leading-relaxed">{q.ex}</p>
          <button onClick={next} className="mt-3 rounded-lg bg-sky-600 px-5 py-2 font-medium text-white hover:bg-sky-500">
            {current + 1 < questions.length ? '下一題 →' : '看總結'}
          </button>
        </div>
      )}

      {srcOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeSrc}>
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
              <div>
                <div className="text-xs text-amber-600 dark:text-amber-400">🤷 本題不計分,已列入下次檢定優先出題</div>
                <div className="mt-0.5 font-bold">📖 出處:{src ? src.title : '比對中…'}</div>
              </div>
              <button onClick={closeSrc} className="rounded px-2 py-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">✕</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {src ? (
                <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">{src.md}</pre>
              ) : (
                <div className="py-10 text-center text-neutral-400">載入手冊段落中…</div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-neutral-200 px-5 py-3 dark:border-neutral-800">
              <Link href={`/handbook/${q.book}/`} target="_blank" className="text-sm text-sky-600 underline dark:text-sky-400">
                開啟完整手冊 ↗
              </Link>
              <button onClick={closeSrc} className="rounded-lg bg-sky-600 px-5 py-2 font-medium text-white hover:bg-sky-500">
                {current + 1 < questions.length ? '繼續下一題 →' : '看總結'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
