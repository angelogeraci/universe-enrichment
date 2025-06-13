import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ALLOWED_KEYS = [
  'facebookBatchSize',
  'facebookPauseMs',
  'facebookRelevanceScoreThreshold'
]

export async function GET() {
  // Récupère tous les paramètres autorisés
  const settings = await prisma.appSetting.findMany({
    where: { key: { in: ALLOWED_KEYS } }
  })
  const result: Record<string, string> = {}
  for (const s of settings) {
    result[s.key] = s.value
  }
  return NextResponse.json(result)
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const updates = Object.entries(body).filter(([key]) => ALLOWED_KEYS.includes(key))
  const results: Record<string, string> = {}
  for (const [key, value] of updates) {
    const updated = await prisma.appSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) }
    })
    results[key] = updated.value
  }
  return NextResponse.json(results)
} 