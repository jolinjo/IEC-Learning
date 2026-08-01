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
  { key: 'D', name: '應用領域', books: ['D1'] },
]

// 五邊形雷達圖的五個能力軸(A 層題多,拆成命名與標示配線兩軸)
export const RADAR_AXES = [
  { key: '命名', name: '物件命名', books: ['A1', 'A2'] },
  { key: '配線', name: '標示配線', books: ['A3', 'A4'] },
  { key: '文件', name: '文件管理', books: ['B1'] },
  { key: '圖面', name: '圖面符號', books: ['C1', 'C2', 'C3'] },
  { key: '安全', name: '安全應用', books: ['D1'] },
]

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

// ===== 匯出/匯入 =====

export function exportProfile(): string | null {
  const p = getProfile()
  if (!p) return null
  return JSON.stringify({ app: 'IEC-Learning', version: 1, profile: p }, null, 2)
}

export function importProfile(json: string): { ok: boolean; msg: string } {
  try {
    const data = JSON.parse(json)
    const p: Profile = data.profile ?? data // 容忍直接匯入 profile 本體
    if (!p?.name || typeof p.qstats !== 'object' || !Array.isArray(p.history)) {
      return { ok: false, msg: '檔案格式不正確' }
    }
    const all = loadProfiles()
    all[p.name] = p
    saveProfiles(all)
    localStorage.setItem(CURRENT_KEY, p.name)
    return { ok: true, msg: `已匯入「${p.name}」的成績並切換為目前使用者` }
  } catch {
    return { ok: false, msg: '無法解析檔案(不是有效的 JSON)' }
  }
}
