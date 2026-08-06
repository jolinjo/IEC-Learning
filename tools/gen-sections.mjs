// 建置時把各手冊 md 依標題切成段落 JSON,供檢定「完全沒印象」功能比對出處
import fs from 'fs'
import path from 'path'

const BOOKS = {
  A1: 'A1_IEC_81346-1_設計與識圖手冊.md',
  A2: 'A2_IEC_81346-2_選碼與識圖手冊.md',
  A3: 'A3_IEC_60445_端子與導線識別手冊.md',
  A4: 'A4_IEC_61175_61666_62491_線號端子與電纜標示手冊.md',
  B1: 'B1_IEC_61355_文件編碼與查閱手冊.md',
  C1: 'C1_IEC_61082-1_繪圖與識圖手冊.md',
  C2: 'C2_IEC_60617_符號速查手冊.md',
  C3: 'C3_IEC_81714-2_符號設計手冊.md',
  D1: 'D1_IEC_60204-1_設計與識圖手冊.md',
  D2: 'D2_IEC_61439_盤體設計與驗證手冊.md',
  D3: 'D3_ISO_12100_機械安全風險評估手冊.md',
  D4: 'D4_ISO_13849-1_IEC_62061_控制系統功能安全手冊.md',
  D5: 'D5_ISO_13850_急停設計手冊.md',
}

const outDir = path.join(process.cwd(), 'public', 'sections')
fs.mkdirSync(outDir, { recursive: true })

for (const [slug, file] of Object.entries(BOOKS)) {
  const raw = fs.readFileSync(path.join(process.cwd(), 'md', file), 'utf-8')
  const start = raw.search(/^# /m)
  const body = start >= 0 ? raw.slice(start) : raw
  const lines = body.split('\n')
  const sections = []
  let cur = null
  for (const ln of lines) {
    const m = ln.match(/^(#{1,3}) (.+)$/)
    if (m) {
      if (cur && cur.md.trim().split('\n').length > 1) sections.push(cur)
      cur = { t: m[2].replace(/[*_`]/g, ''), md: ln + '\n' }
    } else if (cur) {
      cur.md += ln + '\n'
    }
  }
  if (cur && cur.md.trim().split('\n').length > 1) sections.push(cur)
  fs.writeFileSync(path.join(outDir, `${slug}.json`), JSON.stringify(sections))
}
console.log('sections generated:', Object.keys(BOOKS).length, 'books')
