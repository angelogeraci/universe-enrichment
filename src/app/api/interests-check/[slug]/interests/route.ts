import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { slug } = await context.params

    // Récupérer l'Interest Check
    const interestCheck = await prisma.interestCheck.findUnique({
      where: { slug },
      include: {
        interests: {
          include: {
            suggestions: {
              orderBy: [
                { isBestMatch: 'desc' },
                { similarityScore: 'desc' },
                { audience: 'desc' }
              ]
            }
          },
          orderBy: { name: 'asc' }
        }
      }
    })

    if (!interestCheck) {
      return NextResponse.json({ error: 'Interest Check non trouvé' }, { status: 404 })
    }

    // Vérifier que l'utilisateur a accès à cet Interest Check
    if (interestCheck.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Formater les données pour le client
    const interests = interestCheck.interests.map((interest: any) => ({
      id: interest.id,
      name: interest.name,
      country: interest.country,
      status: interest.status,
      suggestions: interest.suggestions.map((suggestion: any) => ({
        id: suggestion.id,
        label: suggestion.label,
        facebookId: suggestion.facebookId, // ✅ AJOUT DE L'ID FACEBOOK
        audience: Number(suggestion.audience),
        similarityScore: Number(suggestion.similarityScore),
        isBestMatch: suggestion.isBestMatch,
        isSelectedByUser: suggestion.isSelectedByUser
      }))
    }))

    return NextResponse.json({ interests })

  } catch (error) {
    console.error('Erreur lors de la récupération des intérêts:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 