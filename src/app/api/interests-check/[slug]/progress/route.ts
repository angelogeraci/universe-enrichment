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

    // Récupérer l'Interest Check avec les statistiques
    const interestCheck = await prisma.interestCheck.findUnique({
      where: { 
        slug,
        ownerId: session.user.id 
      },
      include: {
        _count: {
          select: {
            interests: true
          }
        }
      }
    })

    if (!interestCheck) {
      return NextResponse.json({ error: 'Interest Check non trouvé ou accès refusé' }, { status: 404 })
    }

    // Récupérer les statistiques des intérêts
    const interestsStats = await prisma.interest.groupBy({
      by: ['status'],
      where: { interestCheckId: interestCheck.id },
      _count: { id: true }
    })

    // Compter les intérêts avec des suggestions
    const interestsWithSuggestions = await prisma.interest.count({
      where: { 
        interestCheckId: interestCheck.id,
        suggestions: {
          some: {}
        }
      }
    })

    // Récupérer l'intérêt en cours de traitement si applicable
    let currentInterestLabel = undefined
    if (interestCheck.enrichmentStatus === 'in_progress' && interestCheck.currentInterestIndex !== null) {
      const currentInterest = await prisma.interest.findFirst({
        where: { interestCheckId: interestCheck.id },
        skip: interestCheck.currentInterestIndex || 0,
        take: 1,
        orderBy: { createdAt: 'asc' }
      })
      currentInterestLabel = currentInterest?.name
    }

    // Calculer les métriques
    const totalInterests = interestCheck._count.interests
    const processedCount = interestsStats.find(stat => stat.status === 'done')?._count.id || 0
    const failedCount = interestsStats.find(stat => stat.status === 'failed')?._count.id || 0
    const pendingCount = interestsStats.find(stat => stat.status === 'pending')?._count.id || 0
    const inProgressCount = interestsStats.find(stat => stat.status === 'in_progress')?._count.id || 0

    // Calculer la progression
    const currentProgress = processedCount + failedCount
    const percentage = totalInterests > 0 ? (currentProgress / totalInterests) * 100 : 0

    return NextResponse.json({
      enrichmentStatus: interestCheck.enrichmentStatus,
      progress: {
        current: currentProgress,
        total: totalInterests,
        currentInterestLabel,
        percentage: Math.round(percentage * 100) / 100 // Arrondir à 2 décimales
      },
      metrics: {
        totalInterests,
        withSuggestions: interestsWithSuggestions,
        processed: processedCount,
        failed: failedCount,
        pending: pendingCount,
        inProgress: inProgressCount
      },
      pausedAt: interestCheck.pausedAt
    })

  } catch (error) {
    console.error('Erreur lors de la récupération du progrès:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 