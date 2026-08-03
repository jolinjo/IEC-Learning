import fs from 'fs'
import path from 'path'
import { marked, Renderer } from 'marked'

const PREFIX = process.env.NODE_ENV === 'production' ? '/IEC-Learning' : ''

export { HANDBOOKS, MAP_META, STAGES, type HandbookMeta } from './handbooks'
import { HANDBOOKS, MAP_META, type HandbookMeta } from './handbooks'

export interface TocItem { id: string; text: string; depth: number }

const SLUG_BY_FILE = new Map(
  [...HANDBOOKS, MAP_META].map((h) => [h.file, h.slug]),
)

function stripPreamble(mdText: string): string {
  // 移除標題區與 Word 目錄:從第一個「# 」標題開始渲染(頁首改由 metadata 呈現)
  const idx = mdText.search(/^# /m)
  return idx >= 0 ? mdText.slice(idx) : mdText
}

function applyHighlights(mdText: string): string {
  // !!鐵律!! → 紅底(安全攸關/絕對禁止);==重點== → 黃底(必背記憶)
  // 皆為檢定出題依據;內文允許單一等號,非貪婪比對到下一個標記
  return mdText
    .replace(/!!([^\n]+?)!!/g, '<mark class="vital">$1</mark>')
    .replace(/==([^\n]+?)==/g, '<mark>$1</mark>')
}

function applyStrong(mdText: string): string {
  // 中文全形標點緊貼 ** 時(如「**重點:**內文」)CommonMark 判定不能閉合,
  // 粗體會原樣露出——自行預轉 <strong> 繞過邊界規則
  return mdText.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
}

export function renderHandbook(meta: HandbookMeta): { html: string; toc: TocItem[] } {
  const raw = fs.readFileSync(path.join(process.cwd(), 'md', meta.file), 'utf-8')
  const body = applyStrong(applyHighlights(stripPreamble(raw)))
  const toc: TocItem[] = []
  let hIndex = 0

  const renderer = new Renderer()
  renderer.heading = (text: string, depth: number) => {
    const id = `h-${hIndex++}`
    if (depth <= 2) {
      const plain = text.replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      toc.push({ id, text: plain, depth })
    }
    return `<h${depth} id="${id}">${text}</h${depth}>`
  }
  renderer.image = (href: string, _title: string | null, alt: string) => {
    const src = href.startsWith('images/') ? `${PREFIX}/${href}` : href
    return `<img src="${src}" alt="${alt}" loading="lazy" />`
  }
  renderer.link = (href: string, _title: string | null, text: string) => {
    const target = SLUG_BY_FILE.get(decodeURIComponent(href))
    if (target) {
      const url = target === 'map' ? `${PREFIX}/map/` : `${PREFIX}/handbook/${target}/`
      return `<a href="${url}">${text}</a>`
    }
    const ext = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ''
    return `<a href="${href}"${ext}>${text}</a>`
  }

  let html = marked.parse(body, { renderer, gfm: true }) as string
  // 提示方塊上底色:💡 小知識/⚠️ 注意/🚫 禁止/※ 補充 開頭的段落轉為 callout 卡片
  html = html.replace(/<p>(<strong>)?(💡|⚠️|⚠|🚫|※)/g, (_m, strong, icon) => {
    const cls = icon === '💡' ? 'co-tip' : icon === '🚫' ? 'co-danger' : icon === '※' ? 'co-note' : 'co-warn'
    return `<p class="co ${cls}">${strong ?? ''}${icon}`
  })
  return { html, toc }
}

export function getHandbook(slug: string): HandbookMeta | undefined {
  if (slug === 'map') return MAP_META
  return HANDBOOKS.find((h) => h.slug === slug)
}
