import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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

// Fonction pour rechercher des intérêts Facebook avec scoring contextuel avancé
async function getFacebookInterestSuggestions(query: string, country: string, categoryPath: string[], category: string): Promise<FacebookSuggestion[]> {
  if (!AccessToken) {
    throw new Error('FACEBOOK_ACCESS_TOKEN non défini')
  }

  console.log(`🔍 DÉBUT PROCESSUS - Recherche suggestions Facebook`)
  console.log(`📋 INPUT: query="${query}", country=${country}`)
  console.log(`📂 Path: [${categoryPath.join(' > ')}]`)
  console.log(`🏷️ Catégorie: ${category}`)

  // ÉTAPE 1: Déterminer le contexte à partir du path et catégorie
  const contextKeywords = getContextualKeywords(categoryPath, category)
  
  // ÉTAPE 2: Recherche d'intérêts via Graph API
  const searchUrl = `https://graph.facebook.com/v18.0/search?type=adinterest&q=${encodeURIComponent(query)}&limit=15&access_token=${AccessToken}`
  
  console.log(`🌐 Appel Facebook API: ${searchUrl.replace(AccessToken, '***')}`)
  
  const searchResponse = await fetch(searchUrl)
  const searchData = await searchResponse.json()

  if (searchData.error) {
    console.error('❌ Erreur recherche Facebook:', searchData.error)
    throw new Error(`Erreur Facebook API: ${searchData.error.message}`)
  }

  console.log(`✅ Facebook API: ${searchData.data?.length || 0} intérêts trouvés`)

  if (!searchData.data || searchData.data.length === 0) {
    console.log('⚠️ Aucun intérêt trouvé')
    return []
  }

  // ÉTAPE 3: Calcul des scores pour chaque suggestion
  const suggestions: FacebookSuggestion[] = []

  for (const interest of searchData.data) {
    console.log(`\n🔍 ANALYSE: "${interest.name}"`)
    
    // Score 1: Similarité textuelle
    const textualSimilarity = calculateTextualSimilarity(query, interest.name)
    console.log(`📝 Similarité textuelle: ${(textualSimilarity * 100).toFixed(0)}%`)
    
    // Score 2: Pertinence contextuelle  
    const contextualScore = calculateContextualScore(interest.name, contextKeywords)
    
    // Score 3: Nouveau - Score marque/modèle
    const brandScore = calculateBrandScore(interest.name, query, contextKeywords)
    
    // Score 4: Score d'audience - Correction pour Facebook API
    const lowerBound = interest.audience_size_lower_bound || 0
    const upperBound = interest.audience_size_upper_bound || 0
    const audience = lowerBound > 0 && upperBound > 0 ? Math.round((lowerBound + upperBound) / 2) : 0
    
    const audienceScore = calculateAudienceScore(audience)
    console.log(`👥 Audience: ${lowerBound.toLocaleString()}-${upperBound.toLocaleString()} → Moyenne: ${audience.toLocaleString()} → Score: ${(audienceScore * 100).toFixed(0)}%`)
    
    // Score 5: Type d'intérêt (privilégier "interest")
    const interestTypeScore = interest.type === 'interest' ? 1.0 : 0.7
    console.log(`🎯 Type: ${interest.type} → Score: ${(interestTypeScore * 100).toFixed(0)}%`)
    
    // SCORE FINAL PONDÉRÉ AMÉLIORÉ - CORRECTION PORSCHE
    const finalScore = (
      textualSimilarity * 0.10 +      // 10% - Similarité textuelle 
      contextualScore * 0.20 +        // 20% - Pertinence contextuelle (RÉDUIT pour éviter sur-pondération)
      brandScore * 0.30 +             // 30% - Score marque (AUGMENTÉ pour privilégier marques pures)
      audienceScore * 0.35 +          // 35% - Taille audience (MAJORITÉ - pour privilégier grandes audiences)
      interestTypeScore * 0.05        // 5% - Type d'intérêt
    )
    
    // PÉNALITÉ SECTORIELLE: Détecter les secteurs incompatibles
    let sectorPenalty = 0
    const suggestionLower = interest.name.toLowerCase()
    
    // Pour le secteur Automotive, pénaliser fortement les secteurs non-automobiles
    if (contextKeywords.some(k => ['automotive', 'cars', 'vehicles'].includes(k.toLowerCase()))) {
      const nonAutomotiveSectors = [
        // Mode & Beauté (Tom Ford, etc.)
        'tom ford', 'giorgio armani', 'calvin klein', 'versace', 'prada', 'gucci',
        'cosmetics', 'perfume', 'fragrance', 'makeup', 'beauty', 'fashion', 'clothing',
        
        // Divertissement & Célébrités  
        'entertainment', 'celebrity', 'music', 'singer', 'actor', 'film', 'movie',
        'tv show', 'series', 'band', 'artist', 'performer',
        
        // Tech & Digital
        'software', 'app', 'digital platform', 'website', 'social media', 'tech company',
        
        // Autres secteurs
        'restaurant', 'food', 'cooking', 'sports team', 'football club', 'basketball'
      ]
      
      for (const sector of nonAutomotiveSectors) {
        if (suggestionLower.includes(sector)) {
          sectorPenalty = 0.85  // Pénalité de 85% pour secteurs incompatibles
          console.log(`🚫 PÉNALITÉ SECTORIELLE: "${interest.name}" contient "${sector}" - ${sectorPenalty * 100}% de pénalité`)
          break
        }
      }
    }
    
    // BONUS SPÉCIAL: Correspondance exacte de nom (sans contexte) MAIS avec validation sectorielle
    let exactMatchBonus = 0
    if (interest.name.toLowerCase() === query.toLowerCase() && sectorPenalty === 0) {
      exactMatchBonus = 0.15  // Bonus réduit à 15% et seulement si pas de conflit sectoriel
      console.log(`🎯 BONUS CORRESPONDANCE EXACTE (validée): +${exactMatchBonus}`)
    } else if (interest.name.toLowerCase() === query.toLowerCase() && sectorPenalty > 0) {
      console.log(`❌ CORRESPONDANCE EXACTE REJETÉE: conflit sectoriel détecté`)
    }
    
    // Application de la pénalité sectorielle
    const finalScoreWithPenalty = Math.max(0, finalScore - sectorPenalty + exactMatchBonus)
    
    // Détermination du niveau de pertinence
    const relevance = getRelevanceLevel(finalScoreWithPenalty)
    
    // Raison du matching pour traçabilité
    let matchingReason = ''
    if (textualSimilarity > 0.8) matchingReason += 'Similarité textuelle élevée. '
    if (contextualScore > 0.3) matchingReason += 'Contexte pertinent. '
    if (brandScore > 0.5) matchingReason += 'Marque principale détectée. '
    if (brandScore < 0.2) matchingReason += 'Possiblement un modèle spécifique. '
    if (audienceScore > 0.5) matchingReason += 'Grande audience. '
    if (interestTypeScore === 1.0) matchingReason += 'Type interest. '
    if (!matchingReason) matchingReason = 'Correspondance basique.'
    
    // Ajout du niveau de pertinence dans la raison
    matchingReason += ` [${relevance.level.toUpperCase()}]`
    
    console.log(`🎯 SCORE FINAL: ${(finalScoreWithPenalty * 100).toFixed(0)}% - ${relevance.level} - ${matchingReason}`)
    if (!relevance.isRelevant) {
      console.log(`⚠️ SUGGESTION NON PERTINENTE (< ${(RELEVANCE_THRESHOLDS.MINIMUM_ACCEPTABLE * 100).toFixed(0)}%)`)
    }
    
    suggestions.push({
      label: interest.name,
      audience,
      textualSimilarity,
      contextualScore,
      audienceScore,
      interestTypeScore,
      brandScore,
      finalScore: finalScoreWithPenalty,
      relevanceLevel: relevance.level,
      isRelevant: relevance.isRelevant,
      matchingReason: matchingReason.trim()
    })
  }

  // ÉTAPE 4: Tri par score final décroissant
  const sortedSuggestions = suggestions.sort((a, b) => b.finalScore - a.finalScore)
  
  console.log(`\n🏆 TOP 5 SUGGESTIONS:`)
  sortedSuggestions.slice(0, 5).forEach((suggestion, index) => {
    const relevanceIcon = suggestion.isRelevant ? '✅' : '❌'
    console.log(`${index + 1}. ${relevanceIcon} "${suggestion.label}" - ${(suggestion.finalScore * 100).toFixed(0)}% (${suggestion.relevanceLevel})`)
  })

  // Statistiques de pertinence
  const relevantCount = sortedSuggestions.filter(s => s.isRelevant).length
  const irrelevantCount = sortedSuggestions.length - relevantCount
  console.log(`\n📊 STATISTIQUES: ${relevantCount} pertinentes, ${irrelevantCount} non pertinentes`)

  return sortedSuggestions
}

// POST endpoint pour récupérer les suggestions Facebook
export async function POST(request: NextRequest) {
  try {
    const { critereId, query, country, adAccountId } = await request.json()
    
    console.log(`🔍 RECHERCHE SUGGESTIONS FACEBOOK: "${query}" pour ${country}`)
    
    // Récupération des détails du critère avec path et catégorie
    const critere = await prisma.critere.findUnique({
      where: { id: critereId }
    })
    
    if (!critere) {
      return NextResponse.json({ error: 'Critère non trouvé' }, { status: 404 })
    }
    
    console.log(`📋 Critère trouvé: ${critere.label}`)
    console.log(`📂 CategoryPath: [${critere.categoryPath.join(' > ')}]`)
    console.log(`🏷️ Category: ${critere.category}`)
    
    // Suppression des anciennes suggestions
    await prisma.suggestionFacebook.deleteMany({
      where: { critereId }
    })
    
    // Recherche des nouvelles suggestions avec algorithme contextuel
    const suggestions = await getFacebookInterestSuggestions(
      query, 
      country, 
      critere.categoryPath as string[], 
      critere.category
    )
    
    if (suggestions.length === 0) {
      console.log('⚠️ Aucune suggestion trouvée')
      return NextResponse.json({ 
        message: 'Aucune suggestion trouvée',
        suggestions: [] 
      })
    }
    
    // Sauvegarde des suggestions en base
    const savedSuggestions = []
    let bestMatch = null
    
    console.log(`\n💾 SAUVEGARDE ${suggestions.length} SUGGESTIONS:`)
    
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
      details: error instanceof Error ? error.message : 'Erreur inconnue'
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