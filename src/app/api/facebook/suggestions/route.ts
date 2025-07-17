import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCachedSuggestions, cacheSuggestions } from '@/lib/facebook-cache'
import { prisma } from '@/lib/prisma'
import { calculateSimilarityScore, ScoreWeights } from '@/lib/similarityScore'

// Types
interface FacebookAudience {
  id: string
  name: string
  audience_size_lower_bound?: number
  audience_size_upper_bound?: number
  path?: string[]
}

interface SuggestionRequest {
  // Pour les Interest Checks
  interest?: string
  critere?: string
  query?: string
  // Pour les projets
  critereId?: string
  // Commun
  country: string
  retryAttempt?: number
  maxRetries?: number
  relevanceScoreThreshold?: number
}

// Valeurs par défaut si pas de config
const DEFAULT_WEIGHTS: ScoreWeights = {
  textual: 0.4,
  contextual: 0.25,
  audience: 0.15,
  brand: 0.15,
  interestType: 0.05
}

// Fonction principale qui intègre le cache Facebook
async function getFacebookSuggestions(searchTerm: string, country: string): Promise<{
  success: boolean
  suggestions?: FacebookAudience[]
  fromCache?: boolean
  processingTime?: number
  error?: string
}> {
  const startTime = Date.now()
  
  try {
    // 1. Vérifier le cache d'abord
    const cachedResult = await getCachedSuggestions(searchTerm, country)
    if (cachedResult && cachedResult.length > 0) {
      return {
        success: true,
        suggestions: cachedResult,
        fromCache: true,
        processingTime: Date.now() - startTime
      }
    }

    // 2. Appeler l'API Facebook si pas de cache
    console.log(`🌐 API FACEBOOK: Appel pour "${searchTerm}" (${country})`)
    
    // Configuration Facebook API
    const FB_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN
    const FB_API_VERSION = process.env.FACEBOOK_API_VERSION || 'v21.0'

    if (!FB_TOKEN) {
      throw new Error('Token Facebook non configuré')
    }

    const url = `https://graph.facebook.com/${FB_API_VERSION}/search`
    const params = new URLSearchParams({
      type: 'adinterest',
      q: searchTerm,
      limit: '50',
      locale: `${country === 'FR' ? 'fr_FR' : 'en_US'}`,
      access_token: FB_TOKEN
    })

    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Facebook error (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    const suggestions = data.data || []

    console.log(`✅ API FACEBOOK: ${suggestions.length} suggestions reçues`)

    // 3. Sauvegarder en cache
    if (suggestions.length > 0) {
      await cacheSuggestions(searchTerm, country, suggestions)
    }

    return {
      success: true,
      suggestions,
      fromCache: false,
      processingTime: Date.now() - startTime
    }

  } catch (error) {
    console.error('❌ Erreur getFacebookSuggestions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      processingTime: Date.now() - startTime
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 RECHERCHE SUGGESTIONS FACEBOOK: Début')

    // Parser la requête d'abord pour avoir les paramètres
    const body: SuggestionRequest = await request.json()
    const { interest, critere, query, critereId, country, relevanceScoreThreshold } = body
    const logType = request.headers.get('X-Log-Type') || 'UNKNOWN'
    
    // ✅ BYPASS AUTH pour les enrichissements automatiques internes
    const isInternalEnrichment = ['AUTO_ENRICHMENT', 'INTEREST_CHECK_AUTO'].includes(logType)
    
    if (!isInternalEnrichment) {
      // Vérifier l'authentification seulement pour les appels externes
      const session = await getServerSession(authOptions)
      if (!session?.user) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }
    } else {
      console.log('🔓 BYPASS AUTH: Enrichissement automatique détecté')
    }

    // Déterminer le terme de recherche (interest pour manual, critere/query pour auto)
    const searchTerm = interest || critere || query

    if (!searchTerm || !country) {
      return NextResponse.json(
        { error: 'Les paramètres de recherche et country sont requis' },
        { status: 400 }
      )
    }

    console.log(`🔍 RECHERCHE SUGGESTIONS FACEBOOK: "${searchTerm}" pour ${country} [${logType}]`)

    // ✅ UTILISER LE CACHE INTELLIGENT FACEBOOK
    const result = await getFacebookSuggestions(searchTerm, country)

    if (!result.success) {
      console.error('❌ Erreur lors de la recherche:', result.error)
      
      // Si c'est pour un projet avec critereId, marquer comme NO_SUGGESTIONS
      if (critereId) {
        await prisma.suggestionFacebook.create({
          data: {
            critereId: critereId,
            label: `NO_SUGGESTIONS_${searchTerm.slice(0, 20)}`,
            facebookId: 'NO_SUGGESTIONS',
            audience: 0,
            similarityScore: 0,
            isBestMatch: false,
            isSelectedByUser: false
          }
        })
        console.log(`📝 Marqueur NO_SUGGESTIONS créé pour ${searchTerm}`)
      }
      
      return NextResponse.json(
        { error: result.error || 'Erreur lors de la recherche de suggestions' },
        { status: 500 }
      )
    }

    const suggestions = result.suggestions || []
    console.log(`✅ ${suggestions.length} suggestions trouvées (cache: ${result.fromCache ? 'HIT' : 'MISS'})`)

    // Charger la config pondération
    let scoreWeights = DEFAULT_WEIGHTS
    try {
      const setting = await prisma.appSetting.findUnique({ where: { key: 'scoreWeights' } })
      if (setting && setting.value) {
        scoreWeights = JSON.parse(setting.value)
      }
    } catch (e) {
      // fallback sur défaut
    }

    // Formatter les suggestions pour Interest Check (simple) ou Projet (avec sauvegarde DB)
    const formattedSuggestions = suggestions.map((suggestion: FacebookAudience, index: number) => {
      const score = calculateSimilarityScore({
        input: searchTerm,
        suggestion: {
          label: suggestion.name,
          audience: Math.round(((suggestion.audience_size_lower_bound || 0) + (suggestion.audience_size_upper_bound || 0)) / 2),
          path: suggestion.path || [],
          brand: undefined, // à adapter si info disponible
          type: undefined // à adapter si info disponible
        },
        context: undefined, // à adapter si info disponible
        weights: scoreWeights
      })
      return {
        label: suggestion.name,
        facebookId: suggestion.id,
        audience: Math.round(((suggestion.audience_size_lower_bound || 0) + (suggestion.audience_size_upper_bound || 0)) / 2),
        audienceRange: {
          min: suggestion.audience_size_lower_bound || 0,
          max: suggestion.audience_size_upper_bound || 0
        },
        similarityScore: score,
        isBestMatch: false, // Will be set after sorting
        isSelectedByUser: false,
        path: suggestion.path || []
      }
    })

    // Trier par score décroissant et marquer le meilleur
    formattedSuggestions.sort((a, b) => b.similarityScore - a.similarityScore)
    if (formattedSuggestions.length > 0) {
      formattedSuggestions[0].isBestMatch = true
    }

    // Si c'est pour un projet (avec critereId), sauvegarder en DB
    if (critereId) {
      try {
        // Supprimer les anciennes suggestions pour ce critère
        await prisma.suggestionFacebook.deleteMany({
          where: { critereId: critereId }
        })

        // Créer les nouvelles suggestions avec filtrage par relevance si défini
        const threshold = relevanceScoreThreshold || 0
        const filteredSuggestions = formattedSuggestions.filter(s => s.similarityScore >= threshold)

        if (filteredSuggestions.length > 0) {
          await prisma.suggestionFacebook.createMany({
            data: filteredSuggestions.map(s => ({
              critereId: critereId,
              label: s.label,
              facebookId: s.facebookId,
              audience: s.audience,
              similarityScore: s.similarityScore / 100, // Normaliser en 0-1 pour la DB
              isBestMatch: s.isBestMatch,
              isSelectedByUser: s.isSelectedByUser
            }))
          })
          console.log(`💾 ${filteredSuggestions.length} suggestions sauvegardées en DB`)
        } else {
          // Aucune suggestion pertinente - créer un marqueur
          await prisma.suggestionFacebook.create({
            data: {
              critereId: critereId,
              label: `NO_RELEVANT_SUGGESTIONS_${searchTerm.slice(0, 20)}`,
              facebookId: 'NO_RELEVANT',
              audience: 0,
              similarityScore: 0,
              isBestMatch: false,
              isSelectedByUser: false
            }
          })
          console.log(`📝 Marqueur NO_RELEVANT créé pour ${searchTerm} (seuil: ${threshold})`)
        }
      } catch (dbError) {
        console.error('❌ Erreur sauvegarde DB:', dbError)
        // Continuer même en cas d'erreur DB
      }
    }

    if (formattedSuggestions.length === 0) {
      console.log(`⚠️ Aucune suggestion trouvée`)
    } else {
      console.log('✅ FIN: Suggestions formatées avec succès')
    }

    return NextResponse.json({
      success: true,
      suggestions: formattedSuggestions,
      totalFound: formattedSuggestions.length,
      fromCache: result.fromCache,
      processingTime: result.processingTime || 0
    })

  } catch (error) {
    console.error('❌ Erreur interne lors de la recherche de suggestions:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// GET endpoint pour récupérer les suggestions d'un critère
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const critereId = searchParams.get('critereId')
    
    if (!critereId) {
      return NextResponse.json({ error: 'critereId requis' }, { status: 400 })
    }
    
    const suggestions = await prisma.suggestionFacebook.findMany({
      where: { critereId },
      orderBy: { similarityScore: 'desc' }
    })
    
    return NextResponse.json({ suggestions })
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des suggestions:', error)
    return NextResponse.json({ 
      error: 'Erreur lors de la récupération des suggestions' 
    }, { status: 500 })
  }
} 