import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateSimilarityScore, ScoreWeights } from '@/lib/similarityScore'

// POST /api/interests-check/[slug]/recalculate
export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const body = await request.json()
    const { interestIds } = body // Tableau d'IDs d'intérêts
    console.log('[RECALCULATE] Params:', { slug: params.slug, interestIds })
    if (!Array.isArray(interestIds) || interestIds.length === 0) {
      console.log('[RECALCULATE] Erreur: interestIds requis (array)')
      return NextResponse.json({ error: 'interestIds requis (array)' }, { status: 400 })
    }

    // Charger la config pondération
    const weightsSetting = await prisma.appSetting.findUnique({ where: { key: 'scoreWeights' } })
    let weights: ScoreWeights = {
      textual: 0.25,
      contextual: 0.25,
      audience: 0.25,
      brand: 0.15,
      interestType: 0.05,
      // Ajoute d'autres clés si besoin selon ScoreWeights
    }
    if (weightsSetting) {
      try {
        weights = { ...weights, ...JSON.parse(weightsSetting.value) }
      } catch (e) {
        console.log('[RECALCULATE] Erreur parsing weights:', e)
      }
    }

    // Charger les intérêts
    const interests = await prisma.interest.findMany({
      where: { id: { in: interestIds } },
      include: { suggestions: true },
    })
    console.log(`[RECALCULATE] ${interests.length} intérêts trouvés`)

    let updatedCount = 0
    let errors: string[] = []

    for (const interest of interests) {
      if (!interest.suggestions || interest.suggestions.length === 0) {
        errors.push(`Aucune suggestion pour l'intérêt ${interest.name}`)
        continue
      }
      for (const suggestion of interest.suggestions) {
        try {
          const score = calculateSimilarityScore({
            input: interest.name,
            suggestion: { label: suggestion.label, audience: suggestion.audience },
            weights: weights,
          })
          await prisma.interestSuggestion.update({
            where: { id: suggestion.id },
            data: { similarityScore: score },
          })
          updatedCount++
        } catch (e) {
          console.log('[RECALCULATE] Erreur sur suggestion', suggestion.id, e)
          errors.push(`Erreur sur suggestion ${suggestion.id}: ${e instanceof Error ? e.message : e}`)
        }
      }
    }
    console.log(`[RECALCULATE] Fini. ${updatedCount} scores mis à jour. Erreurs:`, errors)
    return NextResponse.json({ success: true, updatedCount, errors })
  } catch (e) {
    console.log('[RECALCULATE] Exception globale:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
} 