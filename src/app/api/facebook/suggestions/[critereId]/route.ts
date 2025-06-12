import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET - Récupérer les suggestions d'un critère
export async function GET(
  request: NextRequest,
  { params }: { params: { critereId: string } }
) {
  try {
    const { critereId } = params
    
    if (!critereId) {
      return NextResponse.json(
        { error: 'critereId est requis' },
        { status: 400 }
      )
    }
    
    // Récupérer les suggestions du critère
    const suggestions = await prisma.suggestionFacebook.findMany({
      where: { critereId },
      orderBy: { similarityScore: 'desc' }
    })
    
    return NextResponse.json({
      suggestions: suggestions.map(s => ({
        id: s.id,
        label: s.label,
        audience: s.audience,
        similarityScore: s.similarityScore,
        isBestMatch: s.isBestMatch,
        isSelectedByUser: s.isSelectedByUser,
        createdAt: s.createdAt
      }))
    })
    
  } catch (error) {
    console.error('❌ Erreur récupération suggestions:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// PUT - Sélectionner une suggestion pour un critère
export async function PUT(
  request: NextRequest,
  { params }: { params: { critereId: string } }
) {
  try {
    const { critereId } = params
    const { suggestionId } = await request.json()
    
    if (!critereId || !suggestionId) {
      return NextResponse.json(
        { error: 'critereId et suggestionId sont requis' },
        { status: 400 }
      )
    }
    
    // Déselectionner toutes les autres suggestions de ce critère
    await prisma.suggestionFacebook.updateMany({
      where: { critereId },
      data: { isSelectedByUser: false }
    })
    
    // Sélectionner la suggestion choisie
    const selectedSuggestion = await prisma.suggestionFacebook.update({
      where: { id: suggestionId },
      data: { isSelectedByUser: true }
    })
    
    // Mettre à jour le critère avec la suggestion sélectionnée
    await prisma.critere.update({
      where: { id: critereId },
      data: { selectedSuggestionId: suggestionId }
    })
    
    console.log(`🎯 Suggestion sélectionnée pour critère ${critereId}: "${selectedSuggestion.label}"`)
    
    return NextResponse.json({
      message: 'Suggestion sélectionnée avec succès',
      selectedSuggestion
    })
    
  } catch (error) {
    console.error('❌ Erreur sélection suggestion:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 