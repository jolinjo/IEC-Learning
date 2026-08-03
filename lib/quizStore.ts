// 檢定成績資料層(僅在瀏覽器 localStorage,支援多使用者檔案與匯出入)
import { QUESTIONS } from '@/data/questions'

export const MASTER_COUNT = 3 // 每題答對滿 3 次 = 掌握

export interface QStat {
  r: number // 答對次數
  w: number // 答錯次數
}

export interface HistoryRec {
  date: string
  book: string
  score: number
  total: number
  weak: string[]
}

export interface Profile {
  name: string
  qstats: Record<string, QStat> // 以題目 id 為鍵
  history: HistoryRec[]
}

const PROFILES_KEY = 'iecq_profiles'
const CURRENT_KEY = 'iecq_current'

function loadProfiles(): Record<string, Profile> {
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveProfiles(p: Record<string, Profile>) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(p))
}

export function listUsers(): string[] {
  return Object.keys(loadProfiles())
}

export function currentUser(): string | null {
  return localStorage.getItem(CURRENT_KEY)
}

export function setCurrentUser(name: string) {
  localStorage.setItem(CURRENT_KEY, name)
  const all = loadProfiles()
  if (!all[name]) {
    all[name] = { name, qstats: {}, history: [] }
    // 舊版(單人)資料遷移:把舊成績表併入第一個建立的使用者
    try {
      const oldHistory = JSON.parse(localStorage.getItem('iecq_history') ?? '[]')
      if (Array.isArray(oldHistory) && oldHistory.length) {
        all[name].history = oldHistory
        localStorage.removeItem('iecq_history')
        localStorage.removeItem('iecq_stats')
      }
    } catch {}
    saveProfiles(all)
  }
}

export function getProfile(): Profile | null {
  const name = currentUser()
  if (!name) return null
  return loadProfiles()[name] ?? null
}

export function updateProfile(fn: (p: Profile) => void) {
  const name = currentUser()
  if (!name) return
  const all = loadProfiles()
  const p = all[name] ?? { name, qstats: {}, history: [] }
  fn(p)
  all[name] = p
  saveProfiles(all)
}

export function recordAnswer(qid: string, correct: boolean) {
  updateProfile((p) => {
    const s = p.qstats[qid] ?? { r: 0, w: 0 }
    correct ? s.r++ : s.w++
    p.qstats[qid] = s
  })
}

export function recordHistory(rec: HistoryRec) {
  updateProfile((p) => p.history.push(rec))
}

// ===== 掌握度計算(以題為單位,答對滿 3 次=掌握) =====

export const LAYERS = [
  { key: 'A', name: '物件命名', books: ['A1', 'A2', 'A3', 'A4'] },
  { key: 'B', name: '文件分類', books: ['B1'] },
  { key: 'C', name: '圖面表達', books: ['C1', 'C2', 'C3'] },
  { key: 'D', name: '應用領域', books: ['D1', 'D2', 'D3', 'D4', 'D5'] },
]

// 全站五軸(成績彙整 CSV 用)
export const RADAR_AXES = [
  { key: '命名', name: '物件命名', books: ['A1', 'A2'] },
  { key: '配線', name: '標示配線', books: ['A3', 'A4'] },
  { key: '文件', name: '文件管理', books: ['B1'] },
  { key: '圖面', name: '圖面符號', books: ['C1', 'C2', 'C3'] },
  { key: '安全', name: '安全應用', books: ['D1', 'D2', 'D3', 'D4', 'D5'] },
]

// 各學習階段的五邊形能力軸(以主題群組劃分,對應學習路徑)
export const STAGE_RADARS = [
  {
    stage: 1, name: '看懂符號與代號', short: '元件辨識', books: ['C2', 'A1', 'A2'],
    axes: [
      { label: '符號辨識', topics: ['symbol-id', 'symbol-recall'] },
      { label: '符號閱讀', topics: ['symbol-read', 'symbol-use'] },
      { label: '接地保護', topics: ['earthing', 'protection'] },
      { label: '代號結構', topics: ['aspects', 'syntax', 'reading'] },
      { label: '類別選碼', topics: ['main-class', 'sub-class', 'version'] },
    ],
  },
  {
    stage: 2, name: '讀懂一整套圖', short: '圖面辨識', books: ['C1', 'B1'],
    axes: [
      { label: '版面線條', topics: ['layout'] },
      { label: '交互參照', topics: ['reference'] },
      { label: '圖面種類', topics: ['doctypes'] },
      { label: 'DCC 代碼', topics: ['dcc'] },
      { label: '文件查閱', topics: ['doclist', 'doc-apply'] },
    ],
  },
  {
    stage: 3, name: '畫出正規的圖', short: '圖面繪製', books: ['A3', 'A4', 'C3', 'D2'],
    axes: [
      { label: '導線識別', topics: ['colors', 'codes'] },
      { label: '端子標示', topics: ['terminals', 'terminal-id'] },
      { label: '線號電纜', topics: ['signal', 'cable', 'wiring-no'] },
      { label: '符號設計', topics: ['sym-grid', 'sym-nodes', 'sym-design', 'sym-lib'] },
      { label: '盤體驗證', topics: ['panel'] },
    ],
  },
  {
    stage: 4, name: '安全風險設計', short: '安全設計', books: ['D3', 'D1', 'D4', 'D5'],
    axes: [
      { label: '風險評估', topics: ['risk'] },
      { label: '防護裝置', topics: ['guards'] },
      { label: '電氣安全', topics: ['supply', 'colors-d', 'docs-d'] },
      { label: '安全迴路', topics: ['estop', 'func-safety'] },
      { label: '急停設計', topics: ['estop-design'] },
    ],
  },
]

export function masteryOfTopics(qstats: Record<string, QStat>, topics: string[]): Mastery {
  const pool = QUESTIONS.filter((q) => topics.includes(q.topic))
  let mastered = 0
  let inProgress = 0
  for (const q of pool) {
    const s = qstats[q.id]
    if (!s) continue
    if (s.r >= MASTER_COUNT) mastered++
    else if (s.r > 0) inProgress++
  }
  return { mastered, inProgress, total: pool.length, ratio: pool.length ? mastered / pool.length : 0 }
}

export interface Mastery {
  mastered: number
  inProgress: number // 答對過但未滿 3 次
  total: number
  ratio: number
}

export function masteryOf(qstats: Record<string, QStat>, books?: string[]): Mastery {
  const pool = books ? QUESTIONS.filter((q) => books.includes(q.book)) : QUESTIONS
  let mastered = 0
  let inProgress = 0
  for (const q of pool) {
    const s = qstats[q.id]
    if (!s) continue
    if (s.r >= MASTER_COUNT) mastered++
    else if (s.r > 0) inProgress++
  }
  return { mastered, inProgress, total: pool.length, ratio: pool.length ? mastered / pool.length : 0 }
}

export interface Level {
  label: string
  color: string // tailwind class 片段
}

export function levelOf(ratio: number): Level {
  if (ratio >= 1) return { label: '專家', color: 'text-emerald-600 dark:text-emerald-400' }
  if (ratio >= 2 / 3) return { label: '熟練', color: 'text-green-600 dark:text-green-400' }
  if (ratio >= 1 / 3) return { label: '入門', color: 'text-amber-600 dark:text-amber-400' }
  return { label: '新手', color: 'text-neutral-500' }
}

// ===== 匯出/匯入(封裝格式 .iecq:XOR 打亂+SHA-256 簽章,防手動竄改) =====

const SEAL_MAGIC = 'IECQ1'
const SEAL_SALT = 'iecq-seal-v1:d4b7a1c9-竹科黑手電控'

function xorBytes(bytes: Uint8Array): Uint8Array {
  const key = new TextEncoder().encode(SEAL_SALT)
  const out = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ key[i % key.length]
  return out
}

function toB64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(bin)
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SEAL_SALT + text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function exportProfile(): Promise<string | null> {
  const p = getProfile()
  if (!p) return null
  const json = JSON.stringify({ app: 'IEC-Learning', version: 2, profile: p })
  const body = toB64(xorBytes(new TextEncoder().encode(json)))
  const sig = await sha256Hex(json)
  return `${SEAL_MAGIC}.${body}.${sig}`
}

// 解封成績檔:驗證簽章,任何竄改都會被拒收;失敗丟出錯誤訊息
export async function decodeProfileFile(text: string): Promise<Profile> {
  const t = text.trim()
  if (!t.startsWith(SEAL_MAGIC + '.')) throw new Error('不是有效的成績檔(請用新版下載的 .iecq 檔)')
  const parts = t.split('.')
  if (parts.length !== 3) throw new Error('成績檔結構不完整')
  let json: string
  try {
    json = new TextDecoder().decode(xorBytes(fromB64(parts[1])))
  } catch {
    throw new Error('成績檔內容無法解讀')
  }
  if ((await sha256Hex(json)) !== parts[2]) throw new Error('簽章不符——檔案已被修改或損壞')
  const data = JSON.parse(json)
  const p: Profile = data.profile
  if (!p?.name || typeof p.qstats !== 'object' || !Array.isArray(p.history)) {
    throw new Error('成績檔欄位不完整')
  }
  return p
}

export async function importProfile(text: string): Promise<{ ok: boolean; msg: string }> {
  try {
    const p = await decodeProfileFile(text)
    const all = loadProfiles()
    all[p.name] = p
    saveProfiles(all)
    localStorage.setItem(CURRENT_KEY, p.name)
    return { ok: true, msg: `已匯入「${p.name}」的成績並切換為目前使用者` }
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : '無法解析檔案' }
  }
}
