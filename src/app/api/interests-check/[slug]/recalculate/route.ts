import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateSimilarityScore, DEFAULT_WEIGHTS } from '@/lib/similarity-score'

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json()
    const { interestIds } = body
    
    if (!interestIds || !Array.isArray(interestIds)) {
      return NextResponse.json({ error: 'interestIds requis et doit être un tableau' }, { status: 400 })
    }

    // Charger la config pondération
    let scoreWeights = DEFAULT_WEIGHTS
    try {
      const setting = await prisma.appSetting.findUnique({ where: { key: 'scoreWeights' } })
      if (setting && setting.value) {
        scoreWeights = JSON.parse(setting.value)
      }
    } catch (e) {
      // fallback sur défaut
    }

    let updatedCount = 0
    const errors: string[] = []

    // Traiter chaque intérêt
    for (const interestId of interestIds) {
      try {
        const interest = await prisma.interest.findUnique({
          where: { id: interestId },
          include: { suggestions: true }
        })

        if (!interest) {
          errors.push(`Intérêt ${interestId} non trouvé`)
          continue
        }

        // Calculer les nouveaux scores pour toutes les suggestions
        for (const suggestion of interest.suggestions) {
          const score = calculateSimilarityScore({
            input: interest.name,
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
          await prisma.interestSuggestion.update({
            where: { id: suggestion.id },
            data: { 
              similarityScore: score / 100, // Diviser par 100 pour normaliser en 0-1
              isBestMatch: false // Sera mis à jour après tri
            }
          })

          updatedCount++
        }

        // Après mise à jour de toutes les suggestions, déterminer le best match
        const updatedSuggestions = await prisma.interestSuggestion.findMany({
          where: { interestId: interest.id },
          orderBy: { similarityScore: 'desc' }
        })

        // Mettre à jour le best match
        if (updatedSuggestions.length > 0) {
          // Retirer le best match de toutes les suggestions
          await prisma.interestSuggestion.updateMany({
            where: { interestId: interest.id },
            data: { isBestMatch: false }
          })

          // Marquer la suggestion avec le meilleur score comme best match
          await prisma.interestSuggestion.update({
            where: { id: updatedSuggestions[0].id },
            data: { isBestMatch: true }
          })
        }

      } catch (error) {
        console.error(`Erreur lors du recalcul pour l'intérêt ${interestId}:`, error)
        errors.push(`Erreur pour l'intérêt ${interestId}`)
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Erreur lors du recalcul des scores:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 