import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCachedSuggestions, cacheSuggestions } from '@/lib/facebook-cache'
import { calculateSimilarityScore, ScoreWeights } from '@/lib/similarityScore'

interface BatchRequest {
  requests: Array<{
    critereId: string
    searchTerm: string
    country: string
  }>
  maxConcurrency?: number
}

// Pool de contrôle de concurrence
class ConcurrencyPool {
  private running = 0
  private queue: Array<() => Promise<void>> = []
  
  constructor(private maxConcurrency: number = 5) {}
  
  async execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          this.running++
          const result = await task()
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          this.running--
          this.processQueue()
        }
      })
      
      this.processQueue()
    })
  }
  
  private processQueue() {
    if (this.running < this.maxConcurrency && this.queue.length > 0) {
      const task = this.queue.shift()!
      task()
    }
  }
}

async function getFacebookSuggestionsSingle(searchTerm: string, country: string) {
  const startTime = Date.now()
  
  try {
    // 1. Vérifier le cache
    const cachedResult = await getCachedSuggestions(searchTerm, country)
    if (cachedResult && cachedResult.length > 0) {
      return {
        success: true,
        suggestions: cachedResult,
        fromCache: true,
        processingTime: Date.now() - startTime
      }
    }

    // 2. Appeler l'API Facebook
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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      processingTime: Date.now() - startTime
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 TRAITEMENT BATCH FACEBOOK - Début')
    const startTime = Date.now()

    const body: BatchRequest = await request.json()
    const { requests, maxConcurrency = 5 } = body

    if (!Array.isArray(requests) || requests.length === 0) {
      return NextResponse.json({ error: 'requests requis (array)' }, { status: 400 })
    }

    console.log(`📊 BATCH: ${requests.length} requêtes, concurrence max: ${maxConcurrency}`)

    // Charger la config pondération
    let scoreWeights: ScoreWeights = {
      textual: 0.4,
      contextual: 0.25,
      audience: 0.15,
      brand: 0.15,
      interestType: 0.05
    }
    
    try {
      const setting = await prisma.appSetting.findUnique({ where: { key: 'scoreWeights' } })
      if (setting && setting.value) {
        scoreWeights = JSON.parse(setting.value)
      }
    } catch (e) {}

    const pool = new ConcurrencyPool(maxConcurrency)
    const results = []

    // Traiter toutes les requêtes en parallèle contrôlé
    const promises = requests.map(async (req, index) => {
      return pool.execute(async () => {
        console.log(`🔄 [${index + 1}/${requests.length}] Traitement: ${req.searchTerm}`)
        
        const result = await getFacebookSuggestionsSingle(req.searchTerm, req.country)
        
        if (result.success && result.suggestions) {
          // Calculer les scores et sauvegarder en DB
          const critere = await prisma.critere.findUnique({ where: { id: req.critereId } })
          
          if (critere) {
            // Supprimer les anciennes suggestions
            await prisma.suggestionFacebook.deleteMany({
              where: { critereId: req.critereId }
            })

            // Créer les nouvelles suggestions avec scores
            const formattedSuggestions = result.suggestions.map((suggestion: any, idx: number) => {
              const score = calculateSimilarityScore({
                input: req.searchTerm,
                suggestion: {
                  label: suggestion.name,
                  audience: Math.round(((suggestion.audience_size_lower_bound || 0) + (suggestion.audience_size_upper_bound || 0)) / 2),
                  path: suggestion.path || [],
                  brand: undefined,
                  type: undefined
                },
                context: undefined,
                weights: scoreWeights
              })

              return {
                critereId: req.critereId,
                label: suggestion.name,
                facebookId: suggestion.id,
                audience: Math.round(((suggestion.audience_size_lower_bound || 0) + (suggestion.audience_size_upper_bound || 0)) / 2),
                similarityScore: score / 100,
                isBestMatch: false, // Will be set after sorting
                isSelectedByUser: false
              }
            })

            // Trier par score décroissant et marquer le meilleur
            formattedSuggestions.sort((a: any, b: any) => b.similarityScore - a.similarityScore)
            if (formattedSuggestions.length > 0) {
              formattedSuggestions[0].isBestMatch = true
            }

            if (formattedSuggestions.length > 0) {
              await prisma.suggestionFacebook.createMany({
                data: formattedSuggestions
              })
            }

            console.log(`✅ [${index + 1}/${requests.length}] ${req.searchTerm}: ${formattedSuggestions.length} suggestions`)
          }
        } else {
          console.log(`❌ [${index + 1}/${requests.length}] ${req.searchTerm}: ${result.error}`)
        }

        return {
          critereId: req.critereId,
          searchTerm: req.searchTerm,
          success: result.success,
          suggestionCount: result.suggestions?.length || 0,
          fromCache: result.fromCache,
          processingTime: result.processingTime,
          error: result.error
        }
      })
    })

    const batchResults = await Promise.all(promises)
    const totalTime = Date.now() - startTime

    const stats = {
      total: batchResults.length,
      successful: batchResults.filter(r => r.success).length,
      failed: batchResults.filter(r => !r.success).length,
      fromCache: batchResults.filter(r => r.fromCache).length,
      totalSuggestions: batchResults.reduce((sum, r) => sum + r.suggestionCount, 0),
      avgProcessingTime: Math.round(batchResults.reduce((sum, r) => sum + r.processingTime, 0) / batchResults.length),
      totalTime
    }

    console.log(`🎉 BATCH TERMINÉ: ${stats.successful}/${stats.total} succès en ${totalTime}ms`)
    console.log(`📊 Cache hits: ${stats.fromCache}/${stats.total} (${Math.round(stats.fromCache/stats.total*100)}%)`)

    return NextResponse.json({
      success: true,
      results: batchResults,
      stats
    })

  } catch (error) {
    console.error('❌ Erreur traitement batch:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 