import QuizEngine from '@/components/QuizEngine'
import { HANDBOOKS, getHandbook } from '@/lib/content'

export function generateStaticParams() {
  return [{ slug: 'all' }, ...HANDBOOKS.map((h) => ({ slug: h.slug }))]
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const title = slug === 'all' ? '總檢定' : `${getHandbook(slug)?.std} 章節檢定`
  return { title: `${title}|IEC 製圖學習網` }
}

export default async function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const meta = getHandbook(slug)
  const title = slug === 'all' ? '總檢定(全範圍)' : `${meta?.std} ${meta?.title}`
  return <QuizEngine book={slug} title={title} />
}
