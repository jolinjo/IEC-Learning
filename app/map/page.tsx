import { MAP_META, renderHandbook } from '@/lib/content'

export const metadata = { title: 'IEC 規範地圖|IEC 製圖學習網' }

export default function MapPage() {
  const { html } = renderHandbook(MAP_META)
  return (
    <article className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">IEC 規範地圖</h1>
      <p className="mt-1 text-sm text-neutral-500">所有與電氣製圖相關的規範、它們的父子關係,以及每冊手冊在地圖上的位置。</p>
      <div className="prose-doc mt-4" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  )
}
