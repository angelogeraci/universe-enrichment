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
      const critere = await prisma.critere.findUnique({ where: { id: critereId } })
      if (!critere) {
        errors.push(`Critère introuvable: ${critereId}`)
        continue
      }
      
      // Calculer les nouveaux scores pour toutes les suggestions
      for (const suggestion of critere.suggestions) {
        const score = calculateSimilarityScore({
          input: critere.label,
          suggestion: {
            label: suggestion.label,
            audience: suggestion.audience,
            path: [],
            brand: undefined,
            type: undefined
          },
          context: undefined,
          weights: scoreWeights
        })

        // Mise à jour avec nouveau score
        await prisma.suggestionFacebook.update({
          where: { id: suggestion.id },
          data: { 
            similarityScore: score / 100, // Diviser par 100 pour normaliser en 0-1
            isBestMatch: false // Sera mis à jour après tri
          }
        })

        updatedCount++
      }

      // Après mise à jour de toutes les suggestions, déterminer le best match
      const updatedSuggestions = await prisma.suggestionFacebook.findMany({
        where: { critereId: critere.id },
        orderBy: { similarityScore: 'desc' }
      })

      // Mettre à jour le best match
      if (updatedSuggestions.length > 0) {
        // Retirer le best match de toutes les suggestions
        await prisma.suggestionFacebook.updateMany({
          where: { critereId: critere.id },
          data: { isBestMatch: false }
        })

        // Marquer la suggestion avec le meilleur score comme best match
        await prisma.suggestionFacebook.update({
          where: { id: updatedSuggestions[0].id },
          data: { isBestMatch: true }
        })
      }
    }
    
    return NextResponse.json({ success: true, updatedCount, errors })
  } catch (error) {
    console.error('Erreur recalcul score:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
} 