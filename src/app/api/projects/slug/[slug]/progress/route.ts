import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // Compter les critères qui ont été traités par Facebook (qu'ils aient des suggestions ou non)
    // On considère qu'un critère a été traité s'il a au moins une entrée SuggestionFacebook 
    // (même si elle est vide/non pertinente)
    const criteresProcessedByFacebook = await prisma.critere.count({
      where: {
        projectId: project.id,
        suggestions: {
          some: {} // Toute suggestion, y compris les marqueurs NO_SUGGESTIONS
        }
      }
    })

    // Compter les critères avec vraies suggestions Facebook (pour les métriques)
    // Exclure les marqueurs NO_SUGGESTIONS
    const criteresWithFacebook = await prisma.critere.count({
      where: {
        projectId: project.id,
        suggestions: {
          some: {
            AND: [
              { audience: { gt: 0 } }, // Exclure les marqueurs avec audience = 0
              { label: { not: { startsWith: 'NO_SUGGESTIONS_' } } } // Exclure les marqueurs explicites
            ]
          }
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
    let isPausedFacebook = false

    if (project.enrichmentStatus === 'pending') {
      currentStep = 'En attente de démarrage'
      progressPercentage = 0
    } else if (project.enrichmentStatus === 'paused') {
      currentStep = 'Mis en pause'
      progressPercentage = Math.round((criteresProcessedByFacebook / Math.max(criteresCount, 1)) * 100)
      estimatedCompletion = 'En pause'
    } else if (project.enrichmentStatus === 'cancelled') {
      currentStep = 'Annulé'
      progressPercentage = Math.round((criteresProcessedByFacebook / Math.max(criteresCount, 1)) * 100)
      estimatedCompletion = 'Annulé'
    } else if (project.enrichmentStatus === 'processing') {
      // Détection de la pause Facebook (améliorée)
      const now = new Date()
      const lastUpdate = new Date(project.updatedAt)
      const timeSinceUpdate = now.getTime() - lastUpdate.getTime()
      
      if (criteresCount === 0) {
        currentStep = 'Génération des critères IA...'
        progressPercentage = 10
        estimatedCompletion = '2-3 minutes'
      } else if (criteresProcessedByFacebook < criteresCount) {
        // Détecter la pause Facebook
        const settings = await prisma.appSetting.findFirst({ where: { key: 'facebookBatchSize' } })
        const batchSize = Number(settings?.value ?? 100)
        
        // Pause Facebook détectée si :
        // 1. On a traité des critères ET
        // 2. Le nombre de critères traités est un multiple du batch size ET  
        // 3. Pas de mise à jour depuis > 3 secondes
        const isMultipleOfBatch = criteresProcessedByFacebook > 0 && criteresProcessedByFacebook % batchSize === 0
        const noRecentUpdate = timeSinceUpdate > 3000
        
        if (isMultipleOfBatch && noRecentUpdate) {
          currentStep = `⏸️ Pause Facebook (${criteresProcessedByFacebook}/${criteresCount} requêtes)`
          isPausedFacebook = true
        } else {
          currentStep = `Recherche suggestions Facebook... (${criteresProcessedByFacebook}/${criteresCount} requêtes)`
        }
        
        progressPercentage = 30 + Math.round((criteresProcessedByFacebook / criteresCount) * 60)
        const remaining = criteresCount - criteresProcessedByFacebook
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
        current: criteresProcessedByFacebook,
        total: Math.max(totalExpectedCriteres, 1), // Éviter la division par zéro
        step: currentStep,
        percentage: progressPercentage,
        errors: project.enrichmentStatus === 'error' ? 1 : 0,
        eta: estimatedCompletion,
        isPausedFacebook,
        currentCategoryIndex: project.currentCategoryIndex
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
      },
      pausedAt: project.pausedAt
    })

  } catch (error) {
    console.error('Erreur lors de la récupération de la progression:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}