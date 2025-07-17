import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const { slug } = await context.params
    const { action } = await request.json()

    if (!action || !['pause', 'resume', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'Action requise: pause, resume, ou cancel' }, { status: 400 })
    }

    // Vérifier que l'Interest Check appartient à l'utilisateur
    const interestCheck = await prisma.interestCheck.findUnique({
      where: { 
        slug,
        ownerId: user.id 
      }
    })

    if (!interestCheck) {
      return NextResponse.json({ error: 'Interest Check non trouvé' }, { status: 404 })
    }

    let newStatus: string
    let responseMessage: string

    switch (action) {
      case 'pause':
        if (interestCheck.enrichmentStatus !== 'in_progress') {
          return NextResponse.json({ error: 'L\'enrichissement doit être en cours pour être mis en pause' }, { status: 400 })
        }
        newStatus = 'paused'
        responseMessage = 'Enrichissement en batch mis en pause'
        break

      case 'resume':
        if (interestCheck.enrichmentStatus !== 'paused') {
          return NextResponse.json({ error: 'L\'enrichissement doit être en pause pour être repris' }, { status: 400 })
        }
        newStatus = 'in_progress'
        responseMessage = 'Enrichissement en batch repris'
        break

      case 'cancel':
        if (!['in_progress', 'paused'].includes(interestCheck.enrichmentStatus)) {
          return NextResponse.json({ error: 'L\'enrichissement doit être en cours ou en pause pour être annulé' }, { status: 400 })
        }
        newStatus = 'cancelled'
        responseMessage = 'Enrichissement en batch annulé'
        
        // Annuler tous les intérêts pending ou in_progress
        await prisma.interest.updateMany({
          where: {
            interestCheckId: interestCheck.id,
            status: { in: ['pending', 'in_progress'] }
          },
          data: { status: 'cancelled' }
        })
        break

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }

    // Mettre à jour le statut de l'Interest Check
    await prisma.interestCheck.update({
      where: { id: interestCheck.id },
      data: { 
        enrichmentStatus: newStatus,
        updatedAt: new Date()
      }
    })

    console.log(`🎛️ CONTRÔLE BATCH: ${action} sur Interest Check ${slug} → ${newStatus}`)

    return NextResponse.json({ 
      message: responseMessage,
      status: newStatus
    })

  } catch (error) {
    console.error('Erreur lors du contrôle de l\'enrichissement en batch:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' }, 
      { status: 500 }
    )
  }
} 