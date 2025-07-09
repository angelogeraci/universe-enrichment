import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string; interestId: string }> }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { slug, interestId } = await context.params

    // Vérifier que l'Interest Check appartient à l'utilisateur
    const interestCheck = await prisma.interestCheck.findUnique({
      where: { 
        slug,
        ownerId: session.user.id 
      },
      include: {
        interests: {
          where: { id: interestId }
        }
      }
    })

    if (!interestCheck || interestCheck.interests.length === 0) {
      return NextResponse.json({ error: 'Intérêt non trouvé' }, { status: 404 })
    }

    const interest = interestCheck.interests[0]

    // Supprimer les anciennes suggestions
    await prisma.interestSuggestion.deleteMany({
      where: { interestId }
    })

    // Marquer l'intérêt comme en cours de traitement
    await prisma.interest.update({
      where: { id: interestId },
      data: { 
        status: 'in_progress'
      }
    })

    // Déclencher la recherche de suggestions en arrière-plan
    processSingleInterest(interest, interestCheck, slug)

    return NextResponse.json({ 
      success: true,
      message: 'Recherche de suggestions en cours...'
    })

  } catch (error) {
    console.error('Erreur lors du relancement des suggestions:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// Fonction pour traiter un intérêt spécifique
async function processSingleInterest(interest: any, interestCheck: any, slug: string) {
  try {
    console.log(`🔄 RELANCE RECHERCHE FACEBOOK: ${interest.name}`)

    // Construire l'URL de base
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? `https://${process.env.VERCEL_URL || 'localhost:3000'}`
      : 'http://localhost:3000'

    // Appeler l'API Facebook
    const facebookResponse = await fetch(`${baseUrl}/api/facebook/suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Log-Type': 'MANUAL_SEARCH',
        'X-InterestCheck-Slug': slug,
        'X-InterestCheck-Id': interestCheck.id
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
        // Sauvegarder les suggestions en base
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

        // Mettre à jour le statut de l'intérêt
        await prisma.interest.update({
          where: { id: interest.id },
          data: { status: 'done' }
        })

        console.log(`✅ RELANCE RÉUSSIE: ${interest.name} → ${suggestions.length} suggestions trouvées`)
      } else {
        // Aucune suggestion trouvée, mais requête réussie
        await prisma.interest.update({
          where: { id: interest.id },
          data: { status: 'done' }
        })
        console.log(`⚠️ RELANCE SANS RÉSULTAT: ${interest.name}`)
      }
    } else {
      console.log(`❌ ERREUR RELANCE FACEBOOK ${interest.name}: Status ${facebookResponse.status}`)
      
      // Marquer comme échec
      await prisma.interest.update({
        where: { id: interest.id },
        data: { status: 'failed' }
      })
    }

  } catch (error) {
    console.error(`❌ EXCEPTION RELANCE ${interest.name}:`, error)
    
    // Marquer comme échec en cas d'exception
    await prisma.interest.update({
      where: { id: interest.id },
      data: { status: 'failed' }
    })
  }
} 