import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
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
    const { action } = await request.json()

    if (!['pause', 'resume', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'Action non valide' }, { status: 400 })
    }

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

    // Gérer les différentes actions
    let updateData: any = {}

    switch (action) {
      case 'pause':
        if (interestCheck.enrichmentStatus !== 'in_progress') {
          return NextResponse.json({ error: 'L\'enrichissement n\'est pas en cours' }, { status: 400 })
        }
        updateData = {
          enrichmentStatus: 'paused',
          pausedAt: new Date()
        }
        break

      case 'resume':
        if (interestCheck.enrichmentStatus !== 'paused') {
          return NextResponse.json({ error: 'L\'enrichissement n\'est pas en pause' }, { status: 400 })
        }
        updateData = {
          enrichmentStatus: 'in_progress',
          pausedAt: null
        }
        break

      case 'cancel':
        if (!['in_progress', 'paused', 'pending'].includes(interestCheck.enrichmentStatus)) {
          return NextResponse.json({ error: 'Impossible d\'annuler cet enrichissement' }, { status: 400 })
        }
        updateData = {
          enrichmentStatus: 'cancelled',
          pausedAt: null,
          currentInterestIndex: null
        }
        break

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }

    // Mettre à jour l'Interest Check
    const updatedInterestCheck = await prisma.interestCheck.update({
      where: { id: interestCheck.id },
      data: updateData
    })

    // Si c'est une annulation, remettre tous les intérêts en "pending"
    if (action === 'cancel') {
      await prisma.interest.updateMany({
        where: { 
          interestCheckId: interestCheck.id,
          status: { in: ['in_progress', 'pending'] }
        },
        data: { status: 'pending' }
      })
    }

    return NextResponse.json({ 
      success: true, 
      enrichmentStatus: updatedInterestCheck.enrichmentStatus,
      message: getActionMessage(action)
    })

  } catch (error) {
    console.error('Erreur lors du contrôle de l\'enrichissement:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

function getActionMessage(action: string): string {
  switch (action) {
    case 'pause':
      return 'Enrichissement mis en pause'
    case 'resume':
      return 'Enrichissement repris'
    case 'cancel':
      return 'Enrichissement annulé'
    default:
      return 'Action effectuée'
  }
} 