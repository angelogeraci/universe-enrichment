import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
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

    if (!['start', 'pause', 'resume', 'cancel'].includes(action)) {
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
      case 'start':
        if (interestCheck.enrichmentStatus !== 'pending') {
          return NextResponse.json({ error: 'L\'enrichissement doit être en attente pour être démarré' }, { status: 400 })
        }
        updateData = {
          enrichmentStatus: 'in_progress',
          currentInterestIndex: 0,
          pausedAt: null
        }
        
        // Démarrer l'enrichissement en arrière-plan
        enrichInterests(interestCheck.id, interestCheck.slug, interestCheck.country)
        break

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
        
        // Reprendre l'enrichissement en arrière-plan
        enrichInterests(interestCheck.id, interestCheck.slug, interestCheck.country)
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

// Background enrichment function
async function enrichInterests(interestCheckId: string, slug: string, country: string) {
  try {
    console.log(`🎯 DÉBUT ENRICHISSEMENT Interest Check: ${slug}`)

    // DÉTECTION DES INTÉRÊTS BLOQUÉS - Vérifier s'il y a des intérêts bloqués depuis plus de 10 minutes
    const stuckInterests = await prisma.interest.findMany({
      where: {
        interestCheckId,
        status: 'in_progress',
        updatedAt: {
          lt: new Date(Date.now() - 10 * 60 * 1000) // Plus de 10 minutes
        }
      }
    })

    if (stuckInterests.length > 0) {
      console.log(`🔧 DÉBLOCAGE: ${stuckInterests.length} intérêts bloqués détectés`)
      
      // Remettre les intérêts bloqués en "retry"
      await prisma.interest.updateMany({
        where: { 
          id: { in: stuckInterests.map(i => i.id) }
        },
        data: { status: 'retry' }
      })

      // Remettre l'Interest Check en "pending" s'il était en "in_progress"
      const interestCheck = await prisma.interestCheck.findUnique({
        where: { id: interestCheckId }
      })
      
      if (interestCheck?.enrichmentStatus === 'in_progress') {
        await prisma.interestCheck.update({
          where: { id: interestCheckId },
          data: { 
            enrichmentStatus: 'pending',
            updatedAt: new Date()
          }
        })
        console.log(`🔧 Interest Check remis en "pending" après déblocage`)
      }
    }

    // Get all interests for this check
    const interests = await prisma.interest.findMany({
      where: { 
        interestCheckId,
        status: { in: ['pending', 'retry'] }
      },
      orderBy: { createdAt: 'asc' }
    })

    console.log(`📊 Intérêts à traiter: ${interests.length}`)

    // Charger les paramètres de pause Facebook
    const settings = await prisma.appSetting.findMany({
      where: { key: { in: ['facebookBatchSize', 'facebookPauseMs'] } }
    })
    const settingsMap: Record<string, string> = {}
    for (const s of settings) settingsMap[s.key] = s.value
    
    const facebookBatchSize = Number(settingsMap.facebookBatchSize ?? 100)
    const facebookPauseMs = Number(settingsMap.facebookPauseMs ?? 5000)

    let processedCount = 0
    let failedCount = 0
    let facebookRequestCount = 0 // Compteur spécifique pour les pauses

    for (const [index, interest] of interests.entries()) {
      try {
        // Vérifier si l'Interest Check a été mis en pause ou annulé
        const interestCheck = await prisma.interestCheck.findUnique({
          where: { id: interestCheckId }
        })
        
        if (!interestCheck || ['paused', 'cancelled'].includes(interestCheck.enrichmentStatus)) {
          console.log('🛑 Enrichissement Interest Check interrompu:', interest.name)
          return
        }

        console.log(`🔄 RECHERCHE FACEBOOK: ${interest.name}`)

        // Update current progress
        await prisma.interestCheck.update({
          where: { id: interestCheckId },
          data: { currentInterestIndex: index }
        })

        // Update interest status to in_progress
        await prisma.interest.update({
          where: { id: interest.id },
          data: { status: 'in_progress' }
        })

        // Call Facebook API
        const facebookResponse = await fetch('http://localhost:3000/api/facebook/suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Log-Type': 'AUTO_ENRICHMENT',
            'X-InterestCheck-Slug': slug,
            'X-InterestCheck-Id': interestCheckId
          },
          body: JSON.stringify({
            critere: interest.name,
            query: interest.name,
            country: interest.country,
            retryAttempt: 0,
            maxRetries: 3
          })
        })

        facebookRequestCount++ // Incrémenter le compteur de requêtes Facebook

        if (facebookResponse.ok) {
          const facebookData = await facebookResponse.json()
          
          if (facebookData.suggestions && facebookData.suggestions.length > 0) {
            // Save suggestions to database
            const suggestions = facebookData.suggestions.map((suggestion: any) => ({
              interestId: interest.id,
              label: suggestion.label,
              facebookId: suggestion.facebookId,
              audience: suggestion.audience,
              similarityScore: suggestion.similarityScore,
              isBestMatch: suggestion.isBestMatch,
              isSelectedByUser: false
            }))

            await prisma.interestSuggestion.createMany({
              data: suggestions
            })

            console.log(`✅ SUGGESTIONS FACEBOOK: ${suggestions.length} trouvées pour "${interest.name}"`)
            processedCount++
          } else {
            console.log(`⚠️ AUCUNE SUGGESTION: ${interest.name}`)
            processedCount++
          }

          // Mark as done
          await prisma.interest.update({
            where: { id: interest.id },
            data: { status: 'done' }
          })
          
        } else {
          console.error(`❌ ERREUR FACEBOOK ${interest.name}: ${facebookResponse.status}`)
          failedCount++
          
          // Mark as failed
          await prisma.interest.update({
            where: { id: interest.id },
            data: { status: 'failed' }
          })
        }

        // PAUSE FACEBOOK - Pause toutes les facebookBatchSize requêtes
        if (facebookRequestCount % facebookBatchSize === 0 && index < interests.length - 1) {
          console.log(`⏸️ PAUSE FACEBOOK après ${facebookRequestCount} requêtes (${facebookPauseMs}ms)`)
          await new Promise(resolve => setTimeout(resolve, facebookPauseMs))
          
          // Vérifier si l'enrichissement a été mis en pause ou annulé pendant la pause
          const statusAfterPause = await prisma.interestCheck.findUnique({
            where: { id: interestCheckId },
            select: { enrichmentStatus: true }
          })
          
          if (!statusAfterPause || ['cancelled', 'paused'].includes(statusAfterPause.enrichmentStatus)) {
            console.log('🛑 Enrichissement arrêté après la pause Facebook')
            return
          }
          
          console.log(`▶️ Reprise après pause Facebook (${facebookRequestCount} requêtes traitées)`)
        }

      } catch (error) {
        console.error(`❌ EXCEPTION FACEBOOK ${interest.name}:`, error)
        failedCount++
        
        // Mark as failed in case of exception
        await prisma.interest.update({
          where: { id: interest.id },
          data: { status: 'failed' }
        })
      }
    }

    console.log(`🎉 ENRICHISSEMENT TERMINÉ: ${processedCount} traités, ${failedCount} échecs, ${facebookRequestCount} requêtes Facebook`)

    // Mark the Interest Check as done
    await prisma.interestCheck.update({
      where: { id: interestCheckId },
      data: { 
        enrichmentStatus: 'done',
        currentInterestIndex: null
      }
    })

  } catch (error) {
    console.error('❌ Erreur lors de l\'enrichissement Interest Check:', error)
    
    // Mark as failed in case of global error
    await prisma.interestCheck.update({
      where: { id: interestCheckId },
      data: { 
        enrichmentStatus: 'failed',
        currentInterestIndex: null
      }
    })
  }
}

function getActionMessage(action: string): string {
  switch (action) {
    case 'start':
      return 'Enrichissement démarré'
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