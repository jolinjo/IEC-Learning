import Link from 'next/link'
import { HANDBOOKS, getHandbook, renderHandbook } from '@/lib/content'
import { QUESTIONS } from '@/data/questions'

export function generateStaticParams() {
  return HANDBOOKS.map((h) => ({ slug: h.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const meta = getHandbook((await params).slug)
  return { title: `${meta?.std} ${meta?.title}|IEC 製圖學習網` }
}

export default async function HandbookPage({ params }: { params: Promise<{ slug: string }> }) {
  const meta = getHandbook((await params).slug)!
  const { html, toc } = renderHandbook(meta)
  const idx = HANDBOOKS.findIndex((h) => h.slug === meta.slug)
  const ordered = [...HANDBOOKS].sort((a, b) => a.stage - b.stage || a.stageOrder - b.stageOrder)
  const pos = ordered.findIndex((h) => h.slug === meta.slug)
  const quizCount = Math.min(20, QUESTIONS.filter((q) => q.book === meta.slug).length)
  const prev = pos > 0 ? ordered[pos - 1] : null
  const next = pos < ordered.length - 1 ? ordered[pos + 1] : null

  return (
    <div className="lg:flex lg:gap-10">
      <aside className="mb-6 lg:sticky lg:top-20 lg:mb-0 lg:h-[calc(100vh-6rem)] lg:w-64 lg:shrink-0 lg:overflow-y-auto">
        <div className="rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800">
          <div className="font-mono text-xs text-neutral-500">{meta.slug} · {meta.layerName}</div>
          <div className="mt-1 font-bold">{meta.std}</div>
          <div className="text-neutral-600 dark:text-neutral-400">{meta.title}</div>
          <hr className="my-3 border-neutral-200 dark:border-neutral-800" />
          <nav className="space-y-1">
            {toc.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                className={`block truncate hover:text-sky-600 ${t.depth === 1 ? 'font-medium' : 'pl-4 text-neutral-500 dark:text-neutral-400'}`}
              >
                {t.text}
              </a>
            ))}
          </nav>
          <hr className="my-3 border-neutral-200 dark:border-neutral-800" />
          {meta.noQuiz ? (
            <p className="text-xs text-neutral-500">本冊為產品驗證知識,不列入線上檢定。</p>
          ) : (
            <>
              <Link href={`/quiz/${meta.slug}/`} className="block rounded-lg bg-sky-600 px-3 py-2 text-center font-medium text-white hover:bg-sky-500">
                📝 本章檢定
              </Link>
              <p className="mt-2 text-xs text-neutral-500">
                <mark className="rounded-sm bg-yellow-200 px-0.5 dark:bg-yellow-500/30 dark:text-inherit">黃底</mark>=必背重點、
                <mark className="rounded-sm bg-red-200 px-0.5 dark:bg-red-500/30 dark:text-inherit">紅底</mark>=鐵律(違反會出事),皆為檢定出題依據。
              </p>
            </>
          )}
        </div>
      </aside>

      <article className="min-w-0 flex-1">
        <div className="prose-doc" dangerouslySetInnerHTML={{ __html: html }} />
        {!meta.noQuiz && (
          <div className="mt-12 rounded-xl border border-sky-200 bg-sky-50 p-5 text-center dark:border-sky-900 dark:bg-sky-950">
            <div className="font-bold">讀完了嗎?馬上檢定加深印象</div>
            <Link href={`/quiz/${meta.slug}/`} className="mt-3 inline-block rounded-lg bg-sky-600 px-6 py-2 font-medium text-white hover:bg-sky-500">
              開始本章檢定({quizCount} 題)
            </Link>
          </div>
        )}
        <div className="mt-8 flex justify-between text-sm">
          {prev ? (
            <Link href={`/handbook/${prev.slug}/`} className="text-sky-600 hover:underline">← {prev.std} {prev.title}</Link>
          ) : <span />}
          {next ? (
            <Link href={`/handbook/${next.slug}/`} className="text-sky-600 hover:underline">{next.std} {next.title} →</Link>
          ) : <span />}
        </div>
      </article>
    </div>
  )
}
