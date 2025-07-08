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

    // Get all interests for this check
    const interests = await prisma.interest.findMany({
      where: { 
        interestCheckId,
        status: { in: ['pending', 'retry'] }
      },
      orderBy: { createdAt: 'asc' }
    })

    console.log(`📊 Intérêts à traiter: ${interests.length}`)

    let processedCount = 0
    let failedCount = 0

    for (const [index, interest] of interests.entries()) {
      try {
        console.log(`🔄 RECHERCHE FACEBOOK: ${interest.name}`)

        // Update current progress
        await prisma.interestCheck.update({
          where: { id: interestCheckId },
          data: { currentInterestIndex: index }
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

        if (facebookResponse.ok) {
          const facebookData = await facebookResponse.json()
          
          if (facebookData.suggestions && facebookData.suggestions.length > 0) {
            // Save suggestions to database
            const suggestions = facebookData.suggestions.map((suggestion: any) => ({
              interestId: interest.id,
              label: suggestion.label,
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

      } catch (error) {
        console.error(`❌ EXCEPTION FACEBOOK ${interest.name}:`, error)
        
        await prisma.interest.update({
          where: { id: interest.id },
          data: { status: 'retry' }
        })
      }
    }

    // Final status update
    await prisma.interestCheck.update({
      where: { id: interestCheckId },
      data: { 
        enrichmentStatus: 'done',
        currentInterestIndex: null
      }
    })

    console.log(`🎉 SUGGESTIONS FACEBOOK: ${processedCount}/${interests.length} intérêts traités`)
    console.log(`🏁 ENRICHISSEMENT TERMINÉ - Status: done`)
    console.log(`🎉 Enrichissement terminé pour l'Interest Check ${slug}`)

  } catch (error) {
    console.error('Erreur dans l\'enrichissement:', error)
    
    // Mark as failed
    await prisma.interestCheck.update({
      where: { id: interestCheckId },
      data: { 
        enrichmentStatus: 'failed',
        currentInterestIndex: null
      }
    })
  }
} 