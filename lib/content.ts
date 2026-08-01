import fs from 'fs'
import path from 'path'
import { marked, Renderer } from 'marked'

const PREFIX = process.env.NODE_ENV === 'production' ? '/IEC-Learning' : ''

export interface HandbookMeta {
  slug: string
  file: string
  std: string
  title: string
  layer: 'A' | 'B' | 'C' | 'D' | '地圖'
  layerName: string
  stage: 1 | 2 | 3
  stageOrder: number
  blurb: string
}

// 學習路徑:入門(認符號讀代號)→ 進階(讀懂整套圖)→ 精通(畫出正規圖)
export const HANDBOOKS: HandbookMeta[] = [
  { slug: 'C2', file: 'C2_IEC_60617_符號速查手冊.md', std: 'IEC 60617', title: '符號速查', layer: 'C', layerName: '圖面表達', stage: 1, stageOrder: 1, blurb: '認得圖上每個符號——看圖的第一塊磚' },
  { slug: 'A1', file: 'A1_IEC_81346-1_設計與識圖手冊.md', std: 'IEC 81346-1', title: '參考代號與結構化', layer: 'A', layerName: '物件命名', stage: 1, stageOrder: 2, blurb: '=、+、- 代號怎麼組、怎麼讀' },
  { slug: 'A2', file: 'A2_IEC_81346-2_選碼與識圖手冊.md', std: 'IEC 81346-2', title: '類別字母選碼', layer: 'A', layerName: '物件命名', stage: 1, stageOrder: 3, blurb: 'Q、K、B、M 這些字母怎麼選、怎麼查' },
  { slug: 'C1', file: 'C1_IEC_61082-1_繪圖與識圖手冊.md', std: 'IEC 61082-1', title: '圖面編製規則', layer: 'C', layerName: '圖面表達', stage: 2, stageOrder: 1, blurb: '版面、跨頁參照、接點鏡像——讀懂整套圖' },
  { slug: 'B1', file: 'B1_IEC_61355_文件編碼與查閱手冊.md', std: 'IEC 61355', title: '文件分類與編碼', layer: 'B', layerName: '文件分類', stage: 2, stageOrder: 2, blurb: '圖號裡的 DCC 代碼與文件查閱' },
  { slug: 'A3', file: 'A3_IEC_60445_端子與導線識別手冊.md', std: 'IEC 60445', title: '端子與導線識別', layer: 'A', layerName: '物件命名', stage: 3, stageOrder: 1, blurb: '線色鐵律、端子標示——圖與實物對得起來' },
  { slug: 'A4', file: 'A4_IEC_61175_61666_62491_線號端子與電纜標示手冊.md', std: 'IEC 61175/61666/62491', title: '線號與標示合輯', layer: 'A', layerName: '物件命名', stage: 3, stageOrder: 2, blurb: '線號、端子排、電纜標籤的完整系統' },
  { slug: 'D1', file: 'D1_IEC_60204-1_設計與識圖手冊.md', std: 'IEC 60204-1', title: '機械電氣安全', layer: 'D', layerName: '應用領域', stage: 3, stageOrder: 3, blurb: '急停、線色、驗證測試——出圖的安全底線' },
]

export const MAP_META: HandbookMeta = {
  slug: 'map', file: '00_IEC規範地圖.md', std: 'IEC 規範地圖', title: '規範全貌與四層架構',
  layer: '地圖', layerName: '總覽', stage: 1, stageOrder: 0, blurb: '所有相關規範的父子關係一張圖看懂',
}

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
  // ==重點== → <mark>:教材重點黃底,也是檢定出題的依據
  return mdText.replace(/==([^=\n][^=\n]*?)==/g, '<mark>$1</mark>')
}

export function renderHandbook(meta: HandbookMeta): { html: string; toc: TocItem[] } {
  const raw = fs.readFileSync(path.join(process.cwd(), 'md', meta.file), 'utf-8')
  const body = applyHighlights(stripPreamble(raw))
  const toc: TocItem[] = []
  let hIndex = 0

  const renderer = new Renderer()
  renderer.heading = (text: string, depth: number) => {
    const id = `h-${hIndex++}`
    if (depth <= 2) toc.push({ id, text: text.replace(/<[^>]+>/g, ''), depth })
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

  const html = marked.parse(body, { renderer, gfm: true }) as string
  return { html, toc }
}

export function getHandbook(slug: string): HandbookMeta | undefined {
  if (slug === 'map') return MAP_META
  return HANDBOOKS.find((h) => h.slug === slug)
}

export const STAGES = [
  { stage: 1 as const, name: '入門|看懂符號與代號', desc: '先認得圖上的「字」:符號是長相、代號是名字。讀完就能看懂單張迴路圖在說什麼。' },
  { stage: 2 as const, name: '進階|讀懂一整套圖', desc: '跨頁追訊號、查文件、讀圖號。拿到整本圖冊知道從哪裡下手、哪類問題查哪份文件。' },
  { stage: 3 as const, name: '精通|畫出正規的圖', desc: '線色、線號、端子、安全要求——從讀圖者變成出圖者,畫出合規、能驗收的圖。' },
]
