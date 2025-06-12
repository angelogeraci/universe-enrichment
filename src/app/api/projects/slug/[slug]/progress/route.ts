import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { slug } = await params

    // Récupérer le projet avec ses catégories
    const project = await prisma.project.findFirst({
      where: {
        slug: slug,
        ownerId: session.user.id
      },
      include: {
        categoryList: {
          include: {
            categories: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }

    // Compter les critères générés
    const criteresCount = await prisma.critere.count({
      where: { projectId: project.id }
    })

    // Compter les critères avec suggestions Facebook
    const criteresWithFacebook = await prisma.critere.count({
      where: {
        projectId: project.id,
        suggestions: {
          some: {}
        }
      }
    })

    // Compter les critères validés (avec score > 80)
    const criteresValid = await prisma.critere.count({
      where: {
        projectId: project.id,
        status: 'valid'
      }
    })

    // Calculer la progression
    const totalCategories = project.categoryList.categories.length
    const totalExpectedCriteres = criteresCount // On se base sur les critères actuellement générés
    
    // Étapes de progression
    let currentStep = 'Démarrage...'
    let progressPercentage = 0
    let estimatedCompletion = '-'

    if (project.enrichmentStatus === 'pending') {
      currentStep = 'En attente de démarrage'
      progressPercentage = 0
    } else if (project.enrichmentStatus === 'processing') {
      if (criteresCount === 0) {
        currentStep = 'Génération des critères IA...'
        progressPercentage = 10
        estimatedCompletion = '2-3 minutes'
      } else if (criteresWithFacebook < criteresCount) {
        currentStep = `Recherche suggestions Facebook... (${criteresWithFacebook}/${criteresCount})`
        progressPercentage = 30 + Math.round((criteresWithFacebook / criteresCount) * 60)
        const remaining = criteresCount - criteresWithFacebook
        estimatedCompletion = remaining > 0 ? `${Math.ceil(remaining * 0.1)} secondes` : 'Finalisation...'
      } else {
        currentStep = 'Finalisation...'
        progressPercentage = 95
        estimatedCompletion = 'Quelques secondes'
      }
    } else if (project.enrichmentStatus === 'done') {
      currentStep = 'Terminé'
      progressPercentage = 100
      estimatedCompletion = 'Terminé'
    } else if (project.enrichmentStatus === 'error') {
      currentStep = 'Erreur survenue'
      progressPercentage = 0
      estimatedCompletion = 'Échec'
    }

    return NextResponse.json({
      enrichmentStatus: project.enrichmentStatus,
      progress: {
        current: criteresWithFacebook,
        total: Math.max(totalExpectedCriteres, 1), // Éviter la division par zéro
        step: currentStep,
        percentage: progressPercentage,
        errors: project.enrichmentStatus === 'error' ? 1 : 0,
        eta: estimatedCompletion
      },
      metrics: {
        aiCriteria: criteresCount,
        withFacebook: criteresWithFacebook,
        valid: criteresValid,
        totalCategories: totalCategories
      },
      details: {
        categoriesProcessed: totalCategories,
        criteresGenerated: criteresCount,
        facebookSuggestionsObtained: criteresWithFacebook,
        validCriteres: criteresValid
      }
    })

  } catch (error) {
    console.error('Erreur lors de la récupération de la progression:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
} 