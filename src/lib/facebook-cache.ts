import { prisma } from '@/lib/prisma'

// Structure du cache en mémoire
interface CacheEntry {
  suggestions: any[]
  timestamp: number
  country: string
}

// Cache en mémoire pour les suggestions Facebook
const memoryCache = new Map<string, CacheEntry>()

// Durée de validité du cache en mémoire (5 minutes)
const MEMORY_CACHE_TTL = 5 * 60 * 1000

// Durée de validité du cache en base (24 heures)
const DB_CACHE_TTL = 24 * 60 * 60 * 1000

/**
 * Génère une clé de cache normalisée
 */
function generateCacheKey(critere: string, country: string): string {
  // Normaliser le critère : minuscules, supprimer espaces extra, accents
  const normalized = critere
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  
  return `${normalized}::${country.toLowerCase()}`
}

/**
 * Vérifie le cache en mémoire
 */
function getFromMemoryCache(key: string): any[] | null {
  const entry = memoryCache.get(key)
  if (!entry) return null
  
  // Vérifier la validité temporelle
  if (Date.now() - entry.timestamp > MEMORY_CACHE_TTL) {
    memoryCache.delete(key)
    return null
  }
  
  return entry.suggestions
}

/**
 * Sauvegarde dans le cache en mémoire
 */
function saveToMemoryCache(key: string, suggestions: any[], country: string): void {
  memoryCache.set(key, {
    suggestions,
    timestamp: Date.now(),
    country
  })
}

/**
 * Vérifie le cache en base de données
 */
async function getFromDbCache(key: string, country: string): Promise<any[] | null> {
  try {
    const cached = await prisma.facebookSuggestionCache.findFirst({
      where: {
        cacheKey: key,
        country: country,
        createdAt: {
          gte: new Date(Date.now() - DB_CACHE_TTL)
        }
      }
    })
    
    if (!cached) return null
    
    // Parser les suggestions depuis JSON
    const suggestions = JSON.parse(cached.suggestions)
    
    // Sauvegarder aussi en mémoire pour accès rapide
    saveToMemoryCache(key, suggestions, country)
    
    return suggestions
  } catch (error) {
    console.error('Erreur lecture cache DB:', error)
    return null
  }
}

/**
 * Sauvegarde dans le cache en base
 */
async function saveToDbCache(key: string, suggestions: any[], country: string): Promise<void> {
  try {
    await prisma.facebookSuggestionCache.upsert({
      where: { cacheKey: key },
      update: {
        suggestions: JSON.stringify(suggestions),
        country: country,
        createdAt: new Date() // Mise à jour timestamp
      },
      create: {
        cacheKey: key,
        suggestions: JSON.stringify(suggestions),
        country: country
      }
    })
  } catch (error) {
    console.error('Erreur sauvegarde cache DB:', error)
  }
}

/**
 * Fonction principale : récupère des suggestions depuis le cache
 */
export async function getCachedSuggestions(critere: string, country: string): Promise<any[] | null> {
  const key = generateCacheKey(critere, country)
  
  console.log(`🔍 CACHE CHECK: ${critere} (${country})`)
  
  // 1. Vérifier le cache en mémoire (plus rapide)
  const memoryResult = getFromMemoryCache(key)
  if (memoryResult) {
    console.log(`✅ CACHE HIT (Memory): ${critere} - ${memoryResult.length} suggestions`)
    return memoryResult
  }
  
  // 2. Vérifier le cache en base
  const dbResult = await getFromDbCache(key, country)
  if (dbResult) {
    console.log(`✅ CACHE HIT (DB): ${critere} - ${dbResult.length} suggestions`)
    return dbResult
  }
  
  console.log(`❌ CACHE MISS: ${critere}`)
  return null
}

/**
 * Sauvegarde des suggestions dans le cache
 */
export async function cacheSuggestions(critere: string, country: string, suggestions: any[]): Promise<void> {
  if (!suggestions || suggestions.length === 0) return
  
  const key = generateCacheKey(critere, country)
  
  console.log(`💾 CACHE SAVE: ${critere} - ${suggestions.length} suggestions`)
  
  // Sauvegarder en mémoire et en base simultanément
  saveToMemoryCache(key, suggestions, country)
  await saveToDbCache(key, suggestions, country)
}

/**
 * Nettoie le cache ancien
 */
export async function cleanOldCache(): Promise<void> {
  try {
    const deleted = await prisma.facebookSuggestionCache.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - DB_CACHE_TTL)
        }
      }
    })
    
    if (deleted.count > 0) {
      console.log(`🧹 CACHE CLEANUP: ${deleted.count} entrées supprimées`)
    }
  } catch (error) {
    console.error('Erreur nettoyage cache:', error)
  }
}

/**
 * Statistiques du cache
 */
export function getCacheStats() {
  return {
    memoryEntries: memoryCache.size,
    memoryKeys: Array.from(memoryCache.keys()),
    ttl: {
      memory: MEMORY_CACHE_TTL,
      database: DB_CACHE_TTL
    }
  }
}

/**
 * Vide le cache (pour débogage)
 */
export async function clearCache(): Promise<void> {
  memoryCache.clear()
  await prisma.facebookSuggestionCache.deleteMany({})
  console.log('��️ CACHE CLEARED')
} 