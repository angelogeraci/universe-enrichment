import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateSimilarityScore, ScoreWeights } from '@/lib/similarityScore'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { critereIds } = body
    
    if (!Array.isArray(critereIds) || critereIds.length === 0) {
      return NextResponse.json({ error: 'critereIds requis (array)' }, { status: 400 })
    }

    // Charger la config pondération
    let scoreWeights: ScoreWeights = {
      textual: 0.4,
      contextual: 0.25,
      audience: 0.15,
      brand: 0.15,
      interestType: 0.05
    }
    
    try {
      const setting = await prisma.appSetting.findUnique({ where: { key: 'scoreWeights' } })
      if (setting && setting.value) {
        scoreWeights = JSON.parse(setting.value)
      }
    } catch (e) {}

    let updatedCount = 0
    let errors: string[] = []

    for (const critereId of critereIds) {
      const suggestions = await prisma.suggestionFacebook.findMany({
        where: { critereId },
      })
      
      if (!suggestions.length) {
        errors.push(`Aucune suggestion pour critereId ${critereId}`)
        continue
      }
      
      const critere = await prisma.critere.findUnique({ where: { id: critereId } })
      if (!critere) {
        errors.push(`Critère introuvable: ${critereId}`)
        continue
      }
      
      for (const suggestion of suggestions) {
        const newScore = calculateSimilarityScore({
          input: critere.label,
          suggestion: {
            label: suggestion.label,
            audience: suggestion.audience,
            path: undefined,
            brand: undefined,
            type: undefined
          },
          context: undefined,
          weights: scoreWeights
        })
        
        await prisma.suggestionFacebook.update({
          where: { id: suggestion.id },
          data: { similarityScore: newScore / 100 },
        })
        updatedCount++
      }
    }
    
    return NextResponse.json({ success: true, updatedCount, errors })
  } catch (error) {
    console.error('Erreur recalcul score:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
} 