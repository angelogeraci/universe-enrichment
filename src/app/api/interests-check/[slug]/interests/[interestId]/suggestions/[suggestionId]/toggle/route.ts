import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ slug: string; interestId: string; suggestionId: string }> }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { slug, interestId, suggestionId } = await context.params

    // Vérifier que l'Interest Check appartient à l'utilisateur
    const interestCheck = await prisma.interestCheck.findUnique({
      where: { 
        slug,
        ownerId: session.user.id 
      }
    })

    if (!interestCheck) {
      return NextResponse.json({ error: 'Interest Check non trouvé ou accès refusé' }, { status: 404 })
    }

    // Vérifier que l'intérêt appartient à cet Interest Check
    const interest = await prisma.interest.findUnique({
      where: { 
        id: interestId,
        interestCheckId: interestCheck.id
      }
    })

    if (!interest) {
      return NextResponse.json({ error: 'Intérêt non trouvé' }, { status: 404 })
    }

    // Récupérer la suggestion actuelle
    const currentSuggestion = await prisma.interestSuggestion.findUnique({
      where: { 
        id: suggestionId,
        interestId: interestId
      }
    })

    if (!currentSuggestion) {
      return NextResponse.json({ error: 'Suggestion non trouvée' }, { status: 404 })
    }

    // Toggler le statut de sélection
    const newSelectionStatus = !currentSuggestion.isSelectedByUser

    // Si on sélectionne cette suggestion, déselectionner toutes les autres pour cet intérêt
    if (newSelectionStatus) {
      await prisma.interestSuggestion.updateMany({
        where: { 
          interestId: interestId,
          id: { not: suggestionId }
        },
        data: { isSelectedByUser: false }
      })

      // Mettre à jour le selectedSuggestionId de l'intérêt
      await prisma.interest.update({
        where: { id: interestId },
        data: { selectedSuggestionId: suggestionId }
      })
    } else {
      // Si on désélectionne, retirer le selectedSuggestionId
      await prisma.interest.update({
        where: { id: interestId },
        data: { selectedSuggestionId: null }
      })
    }

    // Mettre à jour la suggestion
    const updatedSuggestion = await prisma.interestSuggestion.update({
      where: { id: suggestionId },
      data: { isSelectedByUser: newSelectionStatus }
    })

    return NextResponse.json({ 
      success: true, 
      isSelectedByUser: updatedSuggestion.isSelectedByUser 
    })

  } catch (error) {
    console.error('Erreur lors du toggle de la suggestion:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 