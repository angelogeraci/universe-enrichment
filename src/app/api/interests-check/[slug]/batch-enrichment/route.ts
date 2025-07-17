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
    const { interestIds } = await request.json()

    if (!interestIds || !Array.isArray(interestIds) || interestIds.length === 0) {
      return NextResponse.json({ error: 'interestIds requis (array)' }, { status: 400 })
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

    // Vérifier que tous les intérêts appartiennent à cet Interest Check
    const interests = await prisma.interest.findMany({
      where: {
        id: { in: interestIds },
        interestCheckId: interestCheck.id
      }
    })

    if (interests.length !== interestIds.length) {
      return NextResponse.json({ error: 'Certains intérêts ne sont pas valides' }, { status: 400 })
    }

    // Marquer l'Interest Check comme en cours de batch processing
    await prisma.interestCheck.update({
      where: { id: interestCheck.id },
      data: { 
        enrichmentStatus: 'in_progress',
        currentInterestIndex: 0
      }
    })

    // Marquer tous les intérêts sélectionnés comme pending
    await prisma.interest.updateMany({
      where: { id: { in: interestIds } },
      data: { status: 'pending' }
    })

    // Lancer l'enrichissement en arrière-plan
    enrichSelectedInterests(interestCheck.id, interestCheck.slug, interestCheck.country, interestIds, request)

    return NextResponse.json({ 
      message: 'Enrichissement en batch démarré',
      interestCheckId: interestCheck.id,
      totalInterests: interestIds.length
    })

  } catch (error) {
    console.error('Erreur lors du démarrage de l\'enrichissement en batch:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' }, 
      { status: 500 }
    )
  }
}

// Fonction d'enrichissement en batch des intérêts sélectionnés
async function enrichSelectedInterests(interestCheckId: string, slug: string, country: string, interestIds: string[], request: NextRequest) {
  try {
    console.log(`🎯 DÉBUT ENRICHISSEMENT BATCH Interest Check: ${slug} - ${interestIds.length} intérêts`)

    // Récupérer l'URL de base à partir de la requête
    const requestUrl = new URL(request.url)
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
    console.log(`🌐 URL de base: ${baseUrl}`)

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
    let facebookRequestCount = 0

    // Récupérer tous les intérêts sélectionnés
    const interests = await prisma.interest.findMany({
      where: { 
        id: { in: interestIds },
        interestCheckId: interestCheckId
      },
      orderBy: { createdAt: 'asc' }
    })

    console.log(`📊 Intérêts à traiter: ${interests.length}`)

    for (const [index, interest] of interests.entries()) {
      try {
        // Vérifier si l'Interest Check a été mis en pause ou annulé
        const interestCheck = await prisma.interestCheck.findUnique({
          where: { id: interestCheckId }
        })
        
        if (!interestCheck || ['paused', 'cancelled'].includes(interestCheck.enrichmentStatus)) {
          console.log('🛑 Enrichissement BATCH interrompu:', interest.name)
          return
        }

        console.log(`🔄 BATCH FACEBOOK: ${interest.name} (${index + 1}/${interests.length})`)

        // Mettre à jour la progression
        await prisma.interestCheck.update({
          where: { id: interestCheckId },
          data: { currentInterestIndex: index }
        })

        // Supprimer les anciennes suggestions
        await prisma.interestSuggestion.deleteMany({
          where: { interestId: interest.id }
        })

        // Marquer l'intérêt comme en cours de traitement
        await prisma.interest.update({
          where: { id: interest.id },
          data: { status: 'in_progress' }
        })

        // Appeler l'API Facebook
        try {
          const facebookResponse = await fetch(`${baseUrl}/api/facebook/suggestions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Log-Type': 'BATCH_ENRICHMENT',
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

          facebookRequestCount++

          if (facebookResponse.ok) {
            const facebookData = await facebookResponse.json()
            
            if (facebookData.suggestions && facebookData.suggestions.length > 0) {
              // Sauvegarder les suggestions en base
              const suggestions = facebookData.suggestions.map((suggestion: any) => ({
                interestId: interest.id,
                label: suggestion.label,
                facebookId: suggestion.facebookId,
                audience: suggestion.audience,
                similarityScore: suggestion.similarityScore || 0,
                isBestMatch: false,
                isSelectedByUser: false
              }))

              // Trier par score décroissant et marquer le meilleur
              suggestions.sort((a: any, b: any) => b.similarityScore - a.similarityScore)
              if (suggestions.length > 0) {
                suggestions[0].isBestMatch = true
              }

              await prisma.interestSuggestion.createMany({
                data: suggestions
              })

              // Mettre à jour le statut de l'intérêt
              await prisma.interest.update({
                where: { id: interest.id },
                data: { status: 'done' }
              })

              console.log(`✅ BATCH FACEBOOK: ${interest.name} → ${suggestions.length} trouvées`)
              processedCount++
            } else {
              // Aucune suggestion trouvée, mais requête réussie
              await prisma.interest.update({
                where: { id: interest.id },
                data: { status: 'done' }
              })
              console.log(`⚠️ BATCH AUCUNE SUGGESTION: ${interest.name}`)
              processedCount++
            }
          } else {
            console.log(`❌ BATCH ERREUR FACEBOOK ${interest.name}: Status ${facebookResponse.status}`)
            
            // Marquer comme échec
            await prisma.interest.update({
              where: { id: interest.id },
              data: { status: 'failed' }
            })
            failedCount++
          }
        } catch (fetchError) {
          console.error(`❌ BATCH EXCEPTION FETCH ${interest.name}:`, fetchError)
          
          // Marquer comme échec
          await prisma.interest.update({
            where: { id: interest.id },
            data: { status: 'failed' }
          })
          failedCount++
        }

        // Petite pause entre les requêtes
        await new Promise(resolve => setTimeout(resolve, 100))

        // Pause longue si nécessaire
        if (facebookRequestCount > 0 && facebookRequestCount % facebookBatchSize === 0) {
          console.log(`⏸️ Pause Facebook BATCH de ${facebookPauseMs / 1000}s après ${facebookBatchSize} requêtes...`)
          
          // Vérifier le statut avant la pause
          const statusBeforePause = await prisma.interestCheck.findUnique({ 
            where: { id: interestCheckId } 
          })
          if (!statusBeforePause || ['cancelled', 'paused'].includes(statusBeforePause.enrichmentStatus)) {
            console.log('🛑 Enrichissement BATCH arrêté pendant la pause Facebook')
            return
          }
          
          // Mettre à jour le statut pour indiquer qu'on est toujours en processing
          await prisma.interestCheck.update({
            where: { id: interestCheckId },
            data: { 
              enrichmentStatus: 'in_progress',
              updatedAt: new Date()
            }
          })
          
          // Attendre la pause
          await new Promise(resolve => setTimeout(resolve, facebookPauseMs))
          
          // Vérifier le statut après la pause
          const statusAfterPause = await prisma.interestCheck.findUnique({ 
            where: { id: interestCheckId } 
          })
          if (!statusAfterPause || ['cancelled', 'paused'].includes(statusAfterPause.enrichmentStatus)) {
            console.log('🛑 Enrichissement BATCH arrêté après la pause Facebook')
            return
          }
        }

      } catch (error) {
        console.error(`❌ BATCH EXCEPTION ${interest.name}:`, error)
        
        // Marquer comme échec en cas d'exception
        await prisma.interest.update({
          where: { id: interest.id },
          data: { status: 'failed' }
        })
        failedCount++
      }
    }

    console.log(`🎉 ENRICHISSEMENT BATCH TERMINÉ: ${processedCount} traités, ${failedCount} échecs`)

    // Marquer l'Interest Check comme terminé
    await prisma.interestCheck.update({
      where: { id: interestCheckId },
      data: { 
        enrichmentStatus: 'done',
        currentInterestIndex: interests.length
      }
    })

  } catch (error) {
    console.error('❌ ERREUR ENRICHISSEMENT BATCH:', error)
    
    // Marquer comme erreur
    await prisma.interestCheck.update({
      where: { id: interestCheckId },
      data: { enrichmentStatus: 'error' }
    })
  }
} 