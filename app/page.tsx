import Link from 'next/link'
import { HANDBOOKS, STAGES } from '@/lib/content'

export default function Home() {
  return (
    <div>
      <section className="py-10 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">從看懂圖,到畫出正規的圖</h1>
        <p className="mx-auto mt-4 max-w-2xl text-neutral-600 dark:text-neutral-300">
          用比較人話的方式,帶初學者掌握 IEC 電氣製圖規範:符號怎麼認、代號怎麼讀、
          整套圖冊怎麼查,一路到自己畫出合規、能驗收的圖。每一章讀完都能立即檢定,
          系統會記住你的弱點,越考越準。
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/handbook/C2/" className="rounded-lg bg-sky-600 px-5 py-2.5 font-medium text-white hover:bg-sky-500">
            開始學習
          </Link>
          <Link href="/map/" className="rounded-lg border border-neutral-300 px-5 py-2.5 font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
            先看規範全貌
          </Link>
        </div>
      </section>

      {STAGES.map((s) => (
        <section key={s.stage} className="mt-10">
          <h2 className="text-xl font-bold">
            第 {s.stage} 階段|{s.name.split('|')[1]}
            <span className="ml-3 align-middle text-xs font-normal text-neutral-500">{s.name.split('|')[0]}</span>
          </h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{s.desc}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HANDBOOKS.filter((h) => h.stage === s.stage)
              .sort((a, b) => a.stageOrder - b.stageOrder)
              .map((h) => (
                <Link
                  key={h.slug}
                  href={`/handbook/${h.slug}/`}
                  className="group rounded-xl border border-neutral-200 p-4 transition hover:border-sky-500 hover:shadow-sm dark:border-neutral-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      {h.slug}|{h.layerName}
                    </span>
                    <span className="text-xs text-neutral-400">{h.std}</span>
                  </div>
                  <div className="mt-2 font-bold group-hover:text-sky-600">{h.title}</div>
                  <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{h.blurb}</div>
                </Link>
              ))}
          </div>
        </section>
      ))}

      <section className="mt-12 rounded-xl border border-sky-200 bg-sky-50 p-6 dark:border-sky-900 dark:bg-sky-950">
        <h2 className="text-xl font-bold">📝 線上檢定</h2>
        <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
          每章學完立即考核:每次 20 題,答錯馬上看到正解與解析加深印象;
          系統依你的弱點主題加權出題,成績紀錄保存在你的瀏覽器本機。
        </p>
        <Link href="/quiz/" className="mt-4 inline-block rounded-lg bg-sky-600 px-5 py-2 font-medium text-white hover:bg-sky-500">
          前往檢定
        </Link>
      </section>
    </div>
  )
}
