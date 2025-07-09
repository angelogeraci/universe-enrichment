import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
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

    const { slug } = await request.json()

    if (!slug) {
      return NextResponse.json({ error: 'Slug manquant' }, { status: 400 })
    }

    // Find the Interest Check
    const interestCheck = await prisma.interestCheck.findUnique({
      where: { 
        slug,
        ownerId: user.id
      }
    })

    if (!interestCheck) {
      return NextResponse.json({ error: 'Interest Check non trouvé' }, { status: 404 })
    }

    // Start enrichment in background
    enrichInterests(interestCheck.id, interestCheck.slug, interestCheck.country)

    // Update status to in_progress
    await prisma.interestCheck.update({
      where: { id: interestCheck.id },
      data: { 
        enrichmentStatus: 'in_progress',
        currentInterestIndex: 0
      }
    })

    return NextResponse.json({ 
      message: 'Enrichissement démarré',
      interestCheckId: interestCheck.id
    })
  } catch (error) {
    console.error('Erreur lors du démarrage de l\'enrichissement:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' }, 
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
              facebookId: suggestion.facebookId, // ✅ AJOUT DE L'ID FACEBOOK
              audience: suggestion.audience,
              similarityScore: suggestion.similarityScore || 0,
              isBestMatch: suggestion.isBestMatch || false,
              isSelectedByUser: false
            }))

            await prisma.interestSuggestion.createMany({
              data: suggestions
            })

            // Update interest status
            await prisma.interest.update({
              where: { id: interest.id },
              data: { status: 'done' }
            })

            console.log(`✅ SUGGESTIONS FACEBOOK: ${interest.name} → ${suggestions.length} trouvées`)
            processedCount++
          } else {
            // No suggestions found, but request was successful
            await prisma.interest.update({
              where: { id: interest.id },
              data: { status: 'done' }
            })
            console.log(`⚠️ AUCUNE SUGGESTION: ${interest.name}`)
            processedCount++
          }
        } else {
          console.log(`❌ ERREUR FACEBOOK ${interest.name}: Status ${facebookResponse.status}`)
          
          // Mark as retry for temporary errors, failed for permanent ones
          const status = facebookResponse.status >= 400 && facebookResponse.status < 500 ? 'failed' : 'retry'
          await prisma.interest.update({
            where: { id: interest.id },
            data: { status }
          })
          
          if (status === 'failed') {
            failedCount++
          }
        }

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100))

        // PAUSE LONGUE toutes les facebookBatchSize requêtes
        if (facebookRequestCount > 0 && facebookRequestCount % facebookBatchSize === 0) {
          console.log(`⏸️ Pause Facebook de ${facebookPauseMs / 1000}s après ${facebookBatchSize} requêtes...`)
          
          // Vérifier le statut AVANT la pause longue
          const statusBeforePause = await prisma.interestCheck.findUnique({ 
            where: { id: interestCheckId } 
          })
          if (!statusBeforePause || ['cancelled', 'paused'].includes(statusBeforePause.enrichmentStatus)) {
            console.log('🛑 Enrichissement arrêté pendant la pause Facebook')
            return
          }
          
          // Mettre à jour le statut pour indiquer qu'on est toujours en processing
          await prisma.interestCheck.update({
            where: { id: interestCheckId },
            data: { 
              enrichmentStatus: 'in_progress',
              updatedAt: new Date() // Important pour la détection de pause Facebook
            }
          })
          
          // Attendre la pause
          await new Promise(resolve => setTimeout(resolve, facebookPauseMs))
          
          // Vérifier le statut APRÈS la pause longue 
          const statusAfterPause = await prisma.interestCheck.findUnique({ 
            where: { id: interestCheckId } 
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