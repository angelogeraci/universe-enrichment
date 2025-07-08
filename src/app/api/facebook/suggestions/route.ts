import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { facebookLogger, createFacebookLogEntry, finalizeFacebookLogEntry } from '@/lib/facebook-logger'

// Initialisation de l'API Facebook
const AccessToken = process.env.FACEBOOK_ACCESS_TOKEN

// Constants pour les mots-clés contextuels
const CONTEXT_KEYWORDS = {
  automotive_brands: ['motor', 'automotive', 'company', 'motors', 'corp', 'group', 'auto', 'manufacturer', 'inc'],
  tech_brands: ['technology', 'software', 'tech', 'systems', 'digital', 'solutions', 'inc', 'corp'],
  fashion_brands: ['fashion', 'clothing', 'apparel', 'wear', 'style', 'brand'],
  sports: ['sport', 'team', 'club', 'football', 'basketball', 'soccer'],
  general: ['company', 'corp', 'inc', 'group', 'brand']
}

// Seuils de pertinence
const RELEVANCE_THRESHOLDS = {
  MINIMUM_ACCEPTABLE: 0.30,  // 30% - Seuil minimum pour considérer une suggestion
  HIGH_CONFIDENCE: 0.60,     // 60% - Seuil pour haute confiance
  VERY_HIGH_CONFIDENCE: 0.80 // 80% - Seuil pour très haute confiance
}

// Mots-clés pour détecter les marques vs modèles dans l'automotive
const BRAND_INDICATORS = {
  automotive: ['motor', 'motors', 'company', 'corp', 'corporation', 'automotive', 'auto', 'group', 'inc', 'ltd', 'gmbh', 'ag', 'spa'],
  model_patterns: /^[A-Z][a-z]+ [A-Z0-9]+[a-z]*$/  // Pattern pour détecter les modèles (ex: "Ford Ka", "BMW X5")
}

// Interface pour typer les suggestions avec scoring détaillé
interface FacebookSuggestion {
  label: string
  audience: number
  textualSimilarity: number
  contextualScore: number
  audienceScore: number
  interestTypeScore: number
  brandScore: number  // Nouveau: Score pour privilégier les marques
  finalScore: number
  relevanceLevel: 'très_haute' | 'haute' | 'moyenne' | 'faible' | 'non_pertinente'  // Nouveau: Niveau de pertinence
  matchingReason: string
  isRelevant: boolean  // Nouveau: Indicateur de pertinence
}

// Helper function pour normaliser les termes de recherche (pour calcul de similarité uniquement)
function normalizeForSimilarity(term: string): string {
  return term
    .toLowerCase()
    .trim()
    // Supprimer les éléments entre parenthèses pour améliorer la similarité
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Helper function pour extraire le contenu des parenthèses pour l'analyse contextuelle
function extractParenthesesContent(term: string): string[] {
  const matches = term.match(/\(([^)]+)\)/g)
  if (!matches) return []
  
  return matches.map(match => 
    match.replace(/[()]/g, '').toLowerCase().trim()
  ).filter(content => content.length > 0)
}

// Function pour calculer la similarité textuelle entre deux strings
function calculateTextualSimilarity(str1: string, str2: string): number {
  const s1 = normalizeForSimilarity(str1)
  const s2 = normalizeForSimilarity(str2)
  
  if (s1 === s2) return 1.0
  
  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1
  
  if (longer.length === 0) return 1.0
  
  const distance = levenshteinDistance(longer, shorter)
  return (longer.length - distance) / longer.length
}

// Algorithm de distance de Levenshtein
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

// Function pour déterminer le contexte à partir du path et de la catégorie
function getContextualKeywords(categoryPath: string[], category: string): string[] {
  const pathStr = categoryPath.join('_').toLowerCase()
  const categoryStr = category.toLowerCase()
  
  console.log(`🔍 Analyse contexte: path=[${categoryPath.join(' > ')}], category=${category}`)
  
  // Détection automatique du contexte
  if (categoryStr.includes('automotive') || categoryStr.includes('car')) {
    if (pathStr.includes('brand') || pathStr.includes('marque')) {
      console.log(`🎯 Contexte détecté: automotive_brands`)
      return CONTEXT_KEYWORDS.automotive_brands
    }
  }
  
  if (categoryStr.includes('tech') || categoryStr.includes('technolog')) {
    if (pathStr.includes('brand') || pathStr.includes('marque')) {
      console.log(`🎯 Contexte détecté: tech_brands`)
      return CONTEXT_KEYWORDS.tech_brands
    }
  }
  
  if (categoryStr.includes('fashion') || categoryStr.includes('mode')) {
    console.log(`🎯 Contexte détecté: fashion_brands`)
    return CONTEXT_KEYWORDS.fashion_brands
  }
  
  if (categoryStr.includes('sport') || pathStr.includes('sport')) {
    console.log(`🎯 Contexte détecté: sports`)
    return CONTEXT_KEYWORDS.sports
  }
  
  console.log(`🎯 Contexte détecté: general (fallback)`)
  return CONTEXT_KEYWORDS.general
}

// Fonction pour calculer le score contextuel basé sur la catégorie
function calculateContextualScore(suggestionLabel: string, contextKeywords: string[]): number {
  const suggestion = suggestionLabel.toLowerCase()
  
  console.log(`🔍 Analyse contextuelle: "${suggestionLabel}"`)
  
  // Score de base pour les mots-clés contextuels
  let baseScore = 0
  const matchedKeywords = []
  
  for (const keyword of contextKeywords) {
    if (suggestion.includes(keyword.toLowerCase())) {
      baseScore += 0.3
      matchedKeywords.push(keyword)
    }
  }
  
  // Bonus spécifique pour le secteur Automotive
  const automotiveIndicators = [
    // Termes automobiles directs
    'automotive', 'cars', 'vehicles', 'automobile', 'motor', 'auto',
    'driving', 'car', 'vehicle', 'truck', 'suv', 'sedan', 'coupe',
    
    // Composants et services automobiles
    'engine', 'motor company', 'motors', 'manufacturing', 'dealer',
    'garage', 'service', 'parts', 'repair', 'mechanic',
    
    // Industrie automobile
    'assembly', 'factory', 'production', 'manufacturer', 'engineering',
    'design', 'technology', 'innovation', 'performance'
  ]
  
  const automotiveBonus = automotiveIndicators.filter(indicator => 
    suggestion.includes(indicator)
  ).length * 0.25  // +25% par indicateur automobile trouvé
  
  // Malus pour les secteurs non-automobiles détectés
  const nonAutomotiveIndicators = [
    // Mode et beauté
    'fashion', 'beauty', 'cosmetics', 'perfume', 'fragrance', 'designer',
    'clothing', 'apparel', 'jewelry', 'accessories', 'luxury fashion',
    'runway', 'collection', 'couture', 'makeup', 'skincare',
    
    // Divertissement
    'entertainment', 'movie', 'film', 'music', 'artist', 'actor',
    'celebrity', 'singer', 'musician', 'band', 'show',
    
    // Technologie non-automobile
    'software', 'app', 'digital', 'internet', 'social media', 'platform',
    'website', 'mobile', 'cloud', 'saas', 'gaming',
    
    // Alimentation et boissons
    'food', 'restaurant', 'cuisine', 'cooking', 'beverage', 'wine',
    'beer', 'coffee', 'tea', 'dining', 'chef',
    
    // Finance et immobilier
    'bank', 'finance', 'investment', 'insurance', 'real estate',
    'property', 'loan', 'trading', 'construction',
    
    // Santé et médical
    'medical', 'healthcare', 'pharmaceutical', 'hospital', 'clinic',
    'health', 'medicine', 'doctor', 'treatment'
  ]
  
  const nonAutomotivePenalty = nonAutomotiveIndicators.filter(indicator => 
    suggestion.includes(indicator)
  ).length * 0.4  // -40% par indicateur non-automobile trouvé
  
  const finalScore = Math.max(0, Math.min(1, baseScore + automotiveBonus - nonAutomotivePenalty))
  
  console.log(`📊 Mots-clés contextuels trouvés: [${matchedKeywords.join(', ')}]`)
  if (automotiveBonus > 0) {
    console.log(`🚗 Bonus automobile: +${(automotiveBonus * 100).toFixed(0)}%`)
  }
  if (nonAutomotivePenalty > 0) {
    console.log(`⚠️ Malus non-automobile: -${(nonAutomotivePenalty * 100).toFixed(0)}%`)
  }
  console.log(`🎯 Score contextuel final: ${(finalScore * 100).toFixed(0)}%`)
  
  return finalScore
}

// Fonction pour calculer le score de marque (privilégier marques vs modèles/contextes)
function calculateBrandScore(suggestionLabel: string, query: string, contextKeywords: string[]): number {
  const suggestion = suggestionLabel.toLowerCase()
  const queryLower = query.toLowerCase()
  
  console.log(`🏷️ Analyse marque: "${suggestionLabel}" vs "${query}"`)
  
  // Détection de marque pure (correspondance exacte)
  if (suggestion === queryLower) {
    console.log(`✨ MARQUE PURE détectée: correspondance exacte`)
    return 1.0  // Score maximum pour correspondance exacte
  }
  
  // NOUVEAUTÉ: Détection des descripteurs automobiles POSITIFS
  const automotiveDescriptors = [
    'vehicles', 'cars', 'automotive', 'auto', 'motor company', 'motors',
    'automobile', 'manufacturing', 'group', 'company', 'corp', 'inc',
    'brand', 'manufacturer', 'engineering', 'technology'
  ]
  
  // Si la suggestion contient la marque + descripteur automobile → BONUS
  if (suggestion.includes(queryLower)) {
    const hasAutomotiveDescriptor = automotiveDescriptors.some(descriptor => 
      suggestion.includes(`(${descriptor})`) ||
      suggestion.includes(` ${descriptor}`) ||
      suggestion.includes(`-${descriptor}`) ||
      suggestion.endsWith(` ${descriptor}`)
    )
    
    if (hasAutomotiveDescriptor) {
      console.log(`🏆 MARQUE + DESCRIPTEUR AUTOMOBILE détecté: BONUS MAXIMUM`)
      return 1.0  // Score maximum pour marque + descripteur automobile
    }
  }
  
  // Détection de contextes spécifiques qui diluent la marque (NON automobiles)
  const dilutingContexts = [
    // Contextes sport/divertissement spécifiques
    'in motorsport', 'in racing', 'in sports', 'in sport', 
    'in business', 'in technology', 'in tech', 'in fashion', 'in entertainment',
    'motorsport', 'racing', 'sport', 'sports',
    'fans', 'enthusiasts', 'lovers', 'club', 'community', 'owners',
    'events', 'news', 'magazine', 'media', 'website', 'blog',
    'team', 'racing team', 'official', 'merchandise', 'gear',
    
    // Contextes géographiques qui diluent
    'usa', 'america', 'europe', 'germany', 'italy', 'france', 'uk',
    
    // Services spécifiques (non-marque principale)
    'dealership', 'dealer', 'service', 'parts', 'accessories', 'tuning'
  ]
  
  // Vérifier si la suggestion contient des contextes diluants (NON automobiles)
  const hasDilutingContext = dilutingContexts.some(context => 
    suggestion.includes(` ${context}`) || 
    suggestion.includes(`(${context})`) ||
    suggestion.includes(`- ${context}`) ||
    suggestion.endsWith(` ${context}`)
  )
  
  if (hasDilutingContext) {
    // Si la suggestion contient la marque exacte + contexte diluant, pénaliser
    if (suggestion.includes(queryLower)) {
      console.log(`⚠️ MARQUE + CONTEXTE DILUANT détecté: pénalité appliquée`)
      return 0.3  // Pénalité pour contexte spécifique non-automotive
    } else {
      console.log(`❌ CONTEXTE DILUANT sans marque claire`)
      return 0.1
    }
  }
  
  // Détection de modèles spécifiques (format "Marque Modèle")
  const modelPatterns = [
    // Automotive patterns - modèles spécifiques
    /^(\w+)\s+[A-Z0-9]+$/, // BMW X5, Ford F150, Audi A4
    /^(\w+)\s+\w{1,3}$/, // Ford Ka, BMW i3  
    /^(\w+)\s+(GT|RS|AMG|M|S|SE|SL|CL|GL|ML)\b/, // Performance variants
    
    // Tech patterns  
    /^(\w+)\s+(Pro|Max|Mini|Air|Plus)\b/, // Apple Pro, Samsung Max
    /^(\w+)\s+\d+/, // iPhone 14, Galaxy S23
    
    // Product lines (peuvent être acceptables)
    /^(\w+)\s+(Series|Line|Collection|Edition)\b/, // Product lines
  ]
  
  for (const pattern of modelPatterns) {
    const match = suggestion.match(pattern)
    if (match && match[1].toLowerCase() === queryLower) {
      // Exception pour les "Series" qui peuvent être des gammes de marque
      if (suggestion.includes(' series') || suggestion.includes(' line')) {
        console.log(`📊 GAMME DE MARQUE détectée: ${match[1]} + gamme`)
        return 0.7 // Score bon pour les gammes de marque
      } else {
        console.log(`🚗 MODÈLE SPÉCIFIQUE détecté: ${match[1]} + variante`)
        return 0.2 // Pénalité pour modèles spécifiques
      }
    }
  }
  
  // Bonus pour mots-clés de marque dans le contexte
  const brandKeywords = ['company', 'corporation', 'corp', 'inc', 'group', 'brand', 'manufacturer']
  const hasBrandKeyword = brandKeywords.some(keyword => 
    suggestion.includes(keyword) || contextKeywords.includes(keyword)
  )
  
  if (hasBrandKeyword && suggestion.includes(queryLower)) {
    console.log(`🏢 MARQUE OFFICIELLE détectée avec mots-clés corporatifs`)
    return 0.9  // Score élevé pour marques avec indicateurs corporatifs
  }
  
  // Score de base selon la similarité de nom
  if (suggestion.includes(queryLower)) {
    // Marque présente mais avec autres mots
    const words = suggestion.split(/[\s\-\_\(\)]+/).filter(w => w.length > 0)
    const queryWords = queryLower.split(/[\s\-\_]+/)
    
    // Si c'est principalement la marque avec peu d'autres mots
    if (words.length <= 3 && words.some(word => queryWords.includes(word))) {
      console.log(`🎯 MARQUE AVEC MODIFICATEURS MINEURS`)
      return 0.7
    } else {
      console.log(`📝 MARQUE AVEC DESCRIPTEURS ÉTENDUS`)
      return 0.4
    }
  }
  
  // Aucune correspondance claire de marque
  console.log(`❓ PAS DE CORRESPONDANCE MARQUE CLAIRE`)
  return 0.1
}

// Fonction pour déterminer le niveau de pertinence
function getRelevanceLevel(finalScore: number): {level: FacebookSuggestion['relevanceLevel'], isRelevant: boolean} {
  if (finalScore >= RELEVANCE_THRESHOLDS.VERY_HIGH_CONFIDENCE) {
    return { level: 'très_haute', isRelevant: true }
  } else if (finalScore >= RELEVANCE_THRESHOLDS.HIGH_CONFIDENCE) {
    return { level: 'haute', isRelevant: true }
  } else if (finalScore >= RELEVANCE_THRESHOLDS.MINIMUM_ACCEPTABLE) {
    return { level: 'moyenne', isRelevant: true }
  } else if (finalScore >= 0.15) {
    return { level: 'faible', isRelevant: false }
  } else {
    return { level: 'non_pertinente', isRelevant: false }
  }
}

// Fonction pour calculer le score d'audience amélioré
function calculateAudienceScore(audience: number): number {
  if (audience <= 0) return 0
  
  // Échelle logarithmique pour mieux valoriser les grandes audiences
  // Les audiences > 10M obtiennent des scores très élevés
  const logAudience = Math.log10(audience)
  
  let score = 0
  if (audience >= 100000000) {        // 100M+ personnes
    score = 1.0                       // Score maximum
  } else if (audience >= 50000000) {  // 50M+ personnes  
    score = 0.95
  } else if (audience >= 20000000) {  // 20M+ personnes
    score = 0.90
  } else if (audience >= 10000000) {  // 10M+ personnes
    score = 0.85
  } else if (audience >= 5000000) {   // 5M+ personnes
    score = 0.75
  } else if (audience >= 1000000) {   // 1M+ personnes
    score = 0.60
  } else if (audience >= 500000) {    // 500K+ personnes
    score = 0.45
  } else if (audience >= 100000) {    // 100K+ personnes
    score = 0.30
  } else if (audience >= 50000) {     // 50K+ personnes
    score = 0.20
  } else if (audience >= 10000) {     // 10K+ personnes
    score = 0.10
  } else {                            // < 10K personnes
    score = 0.05
  }
  
  console.log(`📊 Audience ${audience.toLocaleString()} → Score: ${(score * 100).toFixed(0)}%`)
  return score
}

async function testFacebookToken(token: string): Promise<{ isValid: boolean; error?: string }> {
  const logData = createFacebookLogEntry('TOKEN_TEST', 'token-validation')
  
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/me?access_token=${token}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Universe-Enrichment/1.0)',
        },
        signal: AbortSignal.timeout(10000)
      }
    )

    const responseText = await response.text()
    
    facebookLogger.log(finalizeFacebookLogEntry(logData, 'SUCCESS', {
      type: 'TOKEN_TEST',
      critere: 'token-validation',
      responseStatus: response.status,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      responseBody: responseText.substring(0, 500), // Limiter la taille
      finalResult: response.ok ? 'SUCCESS' : 'FAILED'
    }))

    if (!response.ok) {
      return { isValid: false, error: `HTTP ${response.status}: ${responseText}` }
    }

    try {
      const data = JSON.parse(responseText)
      return { isValid: true }
    } catch (parseError) {
      return { isValid: false, error: `Invalid JSON response: ${parseError}` }
    }
  } catch (error) {
    facebookLogger.log(finalizeFacebookLogEntry(logData, 'FAILED', {
      type: 'TOKEN_TEST',
      critere: 'token-validation',
      errorType: 'NETWORK',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      finalResult: 'FAILED'
    }))
    
    return { isValid: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function fetchFacebookSuggestions(
  critere: string, 
  country: string, 
  token: string,
  retryAttempt: number = 0,
  maxRetries: number = 3,
  logType: 'AUTO_ENRICHMENT' | 'MANUAL_SEARCH' = 'MANUAL_SEARCH',
  projectInfo?: { slug?: string; id?: string }
): Promise<{ success: boolean; data?: any[]; error?: string; shouldRetry?: boolean }> {
  
  const logData = createFacebookLogEntry(logType, critere, {
    projectSlug: projectInfo?.slug,
    projectId: projectInfo?.id,
    retryAttempt,
    maxRetries
  })

  console.log(`🔄 RECHERCHE FACEBOOK${retryAttempt > 0 ? ` (Tentative ${retryAttempt + 1}/${maxRetries + 1})` : ''}: ${critere}`)

  try {
    const baseUrl = 'https://graph.facebook.com/v21.0/search'
    const params = new URLSearchParams({
      type: 'adinterest',
      q: critere,
      locale: 'fr_FR',
      access_token: token,
      limit: '10'
    })

    const requestUrl = `${baseUrl}?${params.toString()}`
    const requestPayload = { critere, country, retryAttempt, maxRetries }

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Universe-Enrichment/1.0)',
      },
              signal: AbortSignal.timeout(30000)
    })

    // Collecter les headers de réponse
    const responseHeaders = Object.fromEntries(response.headers.entries())

    // Vérifier le statut HTTP
    if (!response.ok) {
      let errorType: 'RATE_LIMIT' | 'SERVER_ERROR' | 'FACEBOOK_API' = 'FACEBOOK_API'
      let shouldRetry = false

      if (response.status === 429) {
        errorType = 'RATE_LIMIT'
        shouldRetry = retryAttempt < maxRetries
      } else if (response.status >= 500) {
        errorType = 'SERVER_ERROR'
        shouldRetry = retryAttempt < maxRetries
      } else if (response.status === 401 || response.status === 403) {
        errorType = 'FACEBOOK_API'
        shouldRetry = false
      }

      const errorText = await response.text()
      
      facebookLogger.log(finalizeFacebookLogEntry(logData, shouldRetry ? 'RETRY' : 'FAILED', {
        type: logType,
        critere,
        requestPayload,
        responseStatus: response.status,
        responseHeaders,
        responseBody: errorText.substring(0, 1000),
        errorType,
        errorMessage: `HTTP ${response.status}: ${errorText}`,
        retryAttempt,
        maxRetries,
        finalResult: shouldRetry ? 'RETRY' : 'FAILED'
      }))

      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
        shouldRetry
      }
    }

    // Vérifier le Content-Type
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      facebookLogger.log(finalizeFacebookLogEntry(logData, 'FAILED', {
        type: logType,
        critere,
        requestPayload,
        responseStatus: response.status,
        responseHeaders,
        errorType: 'FACEBOOK_API',
        errorMessage: `Invalid Content-Type: ${contentType}`,
        retryAttempt,
        maxRetries,
        finalResult: 'FAILED'
      }))

      return {
        success: false,
        error: `Réponse non-JSON reçue: ${contentType}`,
        shouldRetry: false
      }
    }

    // Parser la réponse JSON
    const responseText = await response.text()
    let facebookData: any

    try {
      facebookData = JSON.parse(responseText)
    } catch (parseError) {
      facebookLogger.log(finalizeFacebookLogEntry(logData, 'FAILED', {
        type: logType,
        critere,
        requestPayload,
        responseStatus: response.status,
        responseHeaders,
        responseBody: responseText.substring(0, 1000),
        errorType: 'PARSE',
        errorMessage: `Erreur de parsing JSON: ${parseError}`,
        retryAttempt,
        maxRetries,
        finalResult: 'FAILED'
      }))

      return {
        success: false,
        error: `Erreur de parsing JSON: ${parseError}`,
        shouldRetry: false
      }
    }

    // Vérifier les erreurs Facebook
    if (facebookData.error) {
      const fbError = facebookData.error
      let errorType: 'TOKEN_INVALID' | 'RATE_LIMIT' | 'FACEBOOK_API' = 'FACEBOOK_API'
      let shouldRetry = false

      // Codes d'erreur Facebook spécifiques
      if ([190, 102, 101].includes(fbError.code)) {
        errorType = 'TOKEN_INVALID'
        shouldRetry = false
      } else if ([17, 4, 32].includes(fbError.code)) {
        errorType = 'RATE_LIMIT'
        shouldRetry = retryAttempt < maxRetries
      } else {
        shouldRetry = retryAttempt < maxRetries
      }

      facebookLogger.log(finalizeFacebookLogEntry(logData, shouldRetry ? 'RETRY' : 'FAILED', {
        type: logType,
        critere,
        requestPayload,
        responseStatus: response.status,
        responseHeaders,
        responseBody: responseText.substring(0, 1000),
        errorType,
        errorMessage: `Facebook API Error ${fbError.code}: ${fbError.message}`,
        retryAttempt,
        maxRetries,
        finalResult: shouldRetry ? 'RETRY' : 'FAILED'
      }))

      return {
        success: false,
        error: `Facebook API Error ${fbError.code}: ${fbError.message}`,
        shouldRetry
      }
    }

    // Succès - traiter les données
    const rawSuggestions = facebookData.data || []
    
    // Simple logging pour les données brutes
    const simpleProcessedSuggestions = rawSuggestions.map((item: any) => ({
      label: item.name,
      audience: item.audience_size_lower_bound && item.audience_size_upper_bound 
        ? `${item.audience_size_lower_bound}-${item.audience_size_upper_bound}`
        : 'N/A',
      similarityScore: 0.8 // Score par défaut
    }))

    facebookLogger.log(finalizeFacebookLogEntry(logData, 'SUCCESS', {
      type: logType,
      critere,
      requestPayload,
      responseStatus: response.status,
      responseHeaders,
      responseBody: JSON.stringify(facebookData).substring(0, 2000),
      retryAttempt,
      maxRetries,
      suggestions: simpleProcessedSuggestions,
      finalResult: 'SUCCESS'
    }))

    console.log(`✅ SUGGESTIONS FACEBOOK: ${rawSuggestions.length} trouvées pour "${critere}"`)
    
    return {
      success: true,
      data: rawSuggestions
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    let shouldRetry = retryAttempt < maxRetries

    facebookLogger.log(finalizeFacebookLogEntry(logData, shouldRetry ? 'RETRY' : 'FAILED', {
      type: logType,
      critere,
      errorType: 'NETWORK',
      errorMessage,
      retryAttempt,
      maxRetries,
      finalResult: shouldRetry ? 'RETRY' : 'FAILED'
    }))

    console.log(`❌ EXCEPTION FACEBOOK ${critere}: ${errorMessage}`)
    
    return { 
      success: false,
      data: [],
      error: errorMessage,
      shouldRetry
    }
  }
}

async function fetchFacebookSuggestionsWithRetry(
  critere: string,
  country: string,
  token: string,
  logType: 'AUTO_ENRICHMENT' | 'MANUAL_SEARCH' = 'MANUAL_SEARCH',
  projectInfo?: { slug?: string; id?: string }
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  
  const maxRetries = 3
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await fetchFacebookSuggestions(
      critere, 
      country, 
      token, 
      attempt, 
      maxRetries,
      logType,
      projectInfo
    )
    
    if (result.success || !result.shouldRetry) {
      return result
    }
    
    // Délai avant retry
    if (attempt < maxRetries) {
      const delays = [2000, 4000, 8000] // 2s, 4s, 8s
      const delay = delays[attempt] || 8000
      console.log(`⏱️  Attente ${delay}ms avant nouvelle tentative...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  return {
    success: false,
    error: 'Échec après tous les essais'
  }
}

// POST endpoint pour récupérer les suggestions Facebook
export async function POST(request: NextRequest) {
  try {
    const { critereId, query, country, adAccountId, relevanceScoreThreshold, critere: directCritere } = await request.json()
    const threshold = typeof relevanceScoreThreshold === 'number' ? relevanceScoreThreshold : 0.3
    
    // Récupérer les headers pour le logging
    const logType = request.headers.get('X-Log-Type') as 'AUTO_ENRICHMENT' | 'MANUAL_SEARCH' || 'MANUAL_SEARCH'
    const projectSlug = request.headers.get('X-Project-Slug') || undefined
    const projectId = request.headers.get('X-Project-Id') || undefined
    const interestCheckSlug = request.headers.get('X-InterestCheck-Slug') || undefined
    const interestCheckId = request.headers.get('X-InterestCheck-Id') || undefined
    
    console.log(`🔍 RECHERCHE SUGGESTIONS FACEBOOK: "${query || directCritere}" pour ${country} [${logType}]`)
    
    let critere = null
    let isInterestCheck = false
    
    // Vérifier si c'est une requête d'Interest Check (pas de critereId)
    if (!critereId && directCritere) {
      isInterestCheck = true
      console.log(`📋 Requête Interest Check: ${directCritere}`)
      console.log(`📂 Type: Interest Check (recherche directe)`)
      console.log(`🏷️ Query: ${directCritere}`)
      
      // Pour les Interest Checks, on utilise des mots-clés génériques
      const contextKeywords = ['general', 'interest', 'audience']
    } else {
      // Récupération des détails du critère avec path et catégorie (pour les projets)
      critere = await prisma.critere.findUnique({
        where: { id: critereId }
      })
      
      if (!critere) {
        return NextResponse.json({ error: 'Critère non trouvé' }, { status: 404 })
      }
      
      console.log(`📋 Critère trouvé: ${critere.label}`)
      console.log(`📂 CategoryPath: [${critere.categoryPath.join(' > ')}]`)
      console.log(`🏷️ Category: ${critere.category}`)
      
      // Suppression des anciennes suggestions (seulement pour les projets)
      await prisma.suggestionFacebook.deleteMany({
        where: { critereId }
      })
    }
    
    // Recherche des nouvelles suggestions avec algorithme contextuel
    const searchQuery = query || directCritere
    const facebookResult = await fetchFacebookSuggestionsWithRetry(
      searchQuery,
      country,
      AccessToken!,
      logType,
      { slug: projectSlug || interestCheckSlug, id: projectId || interestCheckId }
    )
    
    if (!facebookResult.success) {
      return NextResponse.json({ 
        error: facebookResult.error || 'Échec de la recherche Facebook',
        suggestions: [],
        totalFound: 0
      }, { status: 500 })
    }
    
    const allSuggestions = facebookResult.data || []
    
    // TRAITEMENT COMPLET DES SCORES POUR CHAQUE SUGGESTION
    let contextKeywords: string[]
    if (isInterestCheck) {
      // Pour les Interest Checks, utiliser des mots-clés génériques
      contextKeywords = ['general', 'interest', 'audience', 'brand', 'company']
    } else {
      // Pour les projets, utiliser les mots-clés contextuels
      contextKeywords = getContextualKeywords(critere!.categoryPath, critere!.category)
    }
    console.log(`📊 Analyse contextuelle avec mots-clés: [${contextKeywords.join(', ')}]`)
    
    const processedSuggestions: FacebookSuggestion[] = allSuggestions.map((item: any) => {
      const suggestionLabel = item.name
      const audienceMin = item.audience_size_lower_bound || 0
      const audienceMax = item.audience_size_upper_bound || audienceMin
      const averageAudience = Math.round((audienceMin + audienceMax) / 2)
      
      // Calcul de tous les scores
      const textualSimilarity = calculateTextualSimilarity(searchQuery, suggestionLabel)
      const contextualScore = calculateContextualScore(suggestionLabel, contextKeywords)
      const audienceScore = calculateAudienceScore(averageAudience)
      const brandScore = calculateBrandScore(suggestionLabel, searchQuery, contextKeywords)
      
      // Score d'intérêt basé sur le type de suggestion Facebook
      const interestTypeScore = item.disambiguation_category ? 0.1 : 0.05
      
      // Calcul du score final pondéré
      const finalScore = (
        textualSimilarity * 0.40 +      // 40% - Similarité textuelle
        contextualScore * 0.25 +        // 25% - Pertinence contextuelle
        audienceScore * 0.15 +          // 15% - Taille de l'audience
        brandScore * 0.15 +             // 15% - Score de marque/brand
        interestTypeScore * 0.05        // 5% - Type d'intérêt
      )
      
      // Niveau de pertinence et validation
      const relevanceData = getRelevanceLevel(finalScore)
      
      // Raison du matching pour debugging
      const matchingReason = `Textuel: ${(textualSimilarity * 100).toFixed(1)}%, Contexte: ${(contextualScore * 100).toFixed(1)}%, Audience: ${(audienceScore * 100).toFixed(1)}%, Marque: ${(brandScore * 100).toFixed(1)}%`
      
      console.log(`📈 "${suggestionLabel}": Score final ${(finalScore * 100).toFixed(1)}% (${relevanceData.level}) - ${matchingReason}`)
      
      return {
        label: suggestionLabel,
        audience: averageAudience,
        textualSimilarity,
        contextualScore,
        audienceScore,
        interestTypeScore,
        brandScore,
        finalScore,
        relevanceLevel: relevanceData.level,
        matchingReason,
        isRelevant: relevanceData.isRelevant
      } as FacebookSuggestion
    })
    
    // Filtrage dynamique selon le seuil de pertinence
    const suggestions = processedSuggestions.filter(s => s.finalScore >= threshold)
    
    if (suggestions.length === 0) {
      console.log('⚠️ Aucune suggestion trouvée')
      
      // Sauvegarder un marqueur pour indiquer que la requête a été effectuée
      // seulement pour les projets (pas les Interest Checks)
      if (!isInterestCheck && critereId) {
        await prisma.suggestionFacebook.create({
          data: {
            critereId,
            label: `NO_SUGGESTIONS_${Date.now()}`, // Marqueur unique
            audience: 0,
            similarityScore: 0,
            isBestMatch: false,
            isSelectedByUser: false
          }
        })
        console.log('📝 Marqueur "aucune suggestion" sauvegardé pour tracking')
      }
      
      return NextResponse.json({ 
        message: 'Aucune suggestion trouvée',
        suggestions: [],
        totalFound: 0,
        relevantCount: 0,
        irrelevantCount: allSuggestions.length,
        processed: true // Indique que la requête a été traitée
      })
    }
    
    // Sauvegarde des suggestions en base
    const savedSuggestions = []
    let bestMatch = null
    
    console.log(`\n💾 SAUVEGARDE ${suggestions.length} SUGGESTIONS:`)
    
    // Pour les Interest Checks, retourner directement les suggestions sans les sauvegarder
    if (isInterestCheck) {
      // Formater les suggestions pour les Interest Checks
      const formattedSuggestions = suggestions.map(suggestion => ({
        label: suggestion.label,
        audience: suggestion.audience,
        similarityScore: Math.round(suggestion.finalScore * 100),
        isBestMatch: false,
        isSelectedByUser: false
      }))
      
      // Marquer le meilleur match
      if (formattedSuggestions.length > 0) {
        const bestIndex = suggestions.findIndex(s => s.finalScore === Math.max(...suggestions.map(sg => sg.finalScore)))
        if (bestIndex >= 0) {
          formattedSuggestions[bestIndex].isBestMatch = true
          bestMatch = formattedSuggestions[bestIndex]
        }
      }
      
      // Statistiques finales
      const relevantSuggestions = suggestions.filter(s => s.isRelevant)
      const irrelevantSuggestions = suggestions.filter(s => !s.isRelevant)
      
      console.log(`\n🎉 PROCESSUS TERMINÉ (Interest Check):`)
      console.log(`   ✅ ${relevantSuggestions.length} suggestions pertinentes`)
      console.log(`   ❌ ${irrelevantSuggestions.length} suggestions non pertinentes`)
      console.log(`   🎯 Meilleur match: ${bestMatch ? bestMatch.label : 'Aucun'}`)
      
      return NextResponse.json({ 
        message: 'Suggestions trouvées avec succès',
        suggestions: formattedSuggestions,
        bestMatch: bestMatch?.label,
        totalFound: formattedSuggestions.length,
        relevantCount: relevantSuggestions.length,
        irrelevantCount: irrelevantSuggestions.length,
        qualityScore: relevantSuggestions.length > 0 ? Math.round((relevantSuggestions.length / suggestions.length) * 100) : 0
      })
    }
    
    // Pour les projets, sauvegarder en base comme avant
    for (const suggestion of suggestions) {
      const saved = await prisma.suggestionFacebook.create({
        data: {
          critereId,
          label: suggestion.label,
          audience: suggestion.audience,
          similarityScore: Math.round(suggestion.finalScore * 100),
          isBestMatch: false,
          isSelectedByUser: false
        }
      })
      
      savedSuggestions.push(saved)
      
      // Garder le meilleur match PERTINENT pour le marquer
      if (suggestion.isRelevant && (!bestMatch || suggestion.finalScore > bestMatch.finalScore)) {
        bestMatch = { ...saved, finalScore: suggestion.finalScore, relevanceLevel: suggestion.relevanceLevel }
      }
      
      const relevanceIcon = suggestion.isRelevant ? '✅' : '❌'
      const relevanceNote = suggestion.isRelevant ? '' : ' (NON PERTINENTE)'
      console.log(`${relevanceIcon} ${suggestion.label}: ${suggestion.audience.toLocaleString()} personnes (${Math.round(suggestion.finalScore * 100)}% - ${suggestion.relevanceLevel})${relevanceNote}`)
    }
    
    // Marquer le meilleur match pertinent
    if (bestMatch) {
      await prisma.suggestionFacebook.update({
        where: { id: bestMatch.id },
        data: { isBestMatch: true }
      })
      console.log(`🎯 Meilleure suggestion PERTINENTE: "${bestMatch.label}" (${Math.round(bestMatch.finalScore * 100)}% - ${bestMatch.relevanceLevel})`)
    } else {
      console.log(`⚠️ AUCUNE SUGGESTION PERTINENTE TROUVÉE (toutes < ${(RELEVANCE_THRESHOLDS.MINIMUM_ACCEPTABLE * 100).toFixed(0)}%)`)
    }
    
    // Statistiques finales
    const relevantSuggestions = suggestions.filter(s => s.isRelevant)
    const irrelevantSuggestions = suggestions.filter(s => !s.isRelevant)
    
    console.log(`\n🎉 PROCESSUS TERMINÉ:`)
    console.log(`   ✅ ${relevantSuggestions.length} suggestions pertinentes`)
    console.log(`   ❌ ${irrelevantSuggestions.length} suggestions non pertinentes`)
    console.log(`   🎯 Meilleur match: ${bestMatch ? bestMatch.label : 'Aucun'}`)
    
    return NextResponse.json({ 
      message: 'Suggestions trouvées avec succès',
      suggestions: savedSuggestions,
      bestMatch: bestMatch?.label,
      totalFound: savedSuggestions.length,
      relevantCount: relevantSuggestions.length,
      irrelevantCount: irrelevantSuggestions.length,
      qualityScore: relevantSuggestions.length > 0 ? Math.round((relevantSuggestions.length / suggestions.length) * 100) : 0
    })
    
  } catch (error) {
    console.error('❌ Erreur lors de la recherche des suggestions Facebook:', error)
    return NextResponse.json({ 
      error: 'Erreur lors de la recherche des suggestions Facebook',
      suggestions: [],
      totalFound: 0
    }, { status: 500 })
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