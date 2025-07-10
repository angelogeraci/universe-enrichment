// src/lib/similarityScore.ts

export interface ScoreWeights {
  textual: number
  contextual: number
  audience: number
  brand: number
  interestType: number
}

export interface SimilarityScoreParams {
  input: string
  suggestion: {
    label: string
    audience?: number
    path?: string[]
    brand?: string
    type?: string
  }
  context?: {
    path?: string[]
    category?: string
  }
  weights: ScoreWeights
}

// Helpers (ex: Jaccard, Levenshtein, etc.)
function textSimilarity(a: string, b: string): number {
  if (!a || !b) return 0
  a = a.toLowerCase()
  b = b.toLowerCase()
  if (a === b) return 1
  // Simple Jaccard sur les mots
  const setA = new Set(a.split(/\s+/))
  const setB = new Set(b.split(/\s+/))
  const intersection = new Set([...setA].filter(x => setB.has(x)))
  const union = new Set([...setA, ...setB])
  return intersection.size / union.size
}

function contextScore(input: string, suggestion: any, context?: any): number {
  // Si pas de contexte, score neutre
  if (!context || !context.path || !suggestion.path) return 0.5
  // Score 1 si le path contient la catégorie, 0 sinon
  const inputPath = context.path.join('>')
  const suggPath = suggestion.path.join('>')
  return inputPath === suggPath ? 1 : 0
}

function audienceScore(audience?: number): number {
  if (!audience) return 0
  // Score logarithmique, normalisé entre 0 et 1 (max 1M)
  return Math.min(1, Math.log10(audience + 1) / 6)
}

function brandScore(input: string, suggestion: any): number {
  // Score 1 si le label contient la marque, 0 sinon
  if (!suggestion.brand) return 0.5
  return suggestion.label.toLowerCase().includes(suggestion.brand.toLowerCase()) ? 1 : 0
}

function interestTypeScore(type?: string): number {
  // Ex: "interest" = 1, autre = 0.5
  if (!type) return 0.5
  return type === 'interest' ? 1 : 0.5
}

export function calculateSimilarityScore({ input, suggestion, context, weights }: SimilarityScoreParams): number {
  // On ne garde que les poids présents
  const usedWeights: Partial<ScoreWeights> = {}
  let total = 0
  for (const key of Object.keys(weights) as (keyof ScoreWeights)[]) {
    if (weights[key] > 0) {
      usedWeights[key] = weights[key]
      total += weights[key]
    }
  }
  // Normalisation si certains critères sont absents
  for (const key in usedWeights) {
    usedWeights[key as keyof ScoreWeights] = usedWeights[key as keyof ScoreWeights]! / total
  }
  // Calculs
  const scores = {
    textual: textSimilarity(input, suggestion.label),
    contextual: contextScore(input, suggestion, context),
    audience: audienceScore(suggestion.audience),
    brand: brandScore(input, suggestion),
    interestType: interestTypeScore(suggestion.type)
  }
  let final = 0
  for (const key in usedWeights) {
    final += (scores[key as keyof ScoreWeights] || 0) * (usedWeights[key as keyof ScoreWeights] || 0)
  }
  return Math.round(final * 1000) / 10 // Pourcentage (0-100, arrondi 0.1)
} 