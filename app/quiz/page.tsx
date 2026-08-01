import Link from 'next/link'
import { HANDBOOKS } from '@/lib/content'
import { QUESTIONS } from '@/data/questions'

export const metadata = { title: '線上檢定|IEC 製圖學習網' }

export default function QuizIndex() {
  const count = (slug: string) => QUESTIONS.filter((q) => q.book === slug).length
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">線上檢定</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        每次隨機 20 題:答錯立即顯示正解與解析;系統會記住你各主題的答題狀況,
        弱點主題出題機率自動提高。成績只保存在你的瀏覽器本機。
      </p>

      <Link
        href="/quiz/all/"
        className="mt-6 block rounded-xl border-2 border-sky-500 bg-sky-50 p-5 hover:bg-sky-100 dark:bg-sky-950 dark:hover:bg-sky-900"
      >
        <div className="text-lg font-bold">🏆 總檢定(全範圍)</div>
        <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          橫跨八冊、共 {QUESTIONS.length} 題題庫中抽 20 題,檢驗整體實力
        </div>
      </Link>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {HANDBOOKS.map((h) => (
          <Link
            key={h.slug}
            href={`/quiz/${h.slug}/`}
            className="rounded-xl border border-neutral-200 p-4 hover:border-sky-400 dark:border-neutral-800"
          >
            <div className="font-mono text-xs text-neutral-500">{h.slug}|題庫 {count(h.slug)} 題</div>
            <div className="mt-1 font-bold">{h.std} {h.title}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
