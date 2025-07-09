import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCacheStats } from '@/lib/facebook-cache'

export async function GET() {
  try {
    console.log('🔍 DÉBUT: Récupération des métriques de performance complètes')

    // 1. MÉTRIQUES PROJETS (existant)
    const projectsData = await getProjectsPerformance()

    // 2. MÉTRIQUES INTEREST CHECKS (NOUVEAU) 
    const interestChecksData = await getInterestChecksPerformance()

    // 3. MÉTRIQUES FACEBOOK API (NOUVEAU - Interest Checks + Projets)
    const facebookApiData = await getFacebookApiMetrics()

    // 4. MÉTRIQUES CACHE GLOBAL
    const cacheData = await getCacheMetrics()

    // 5. SYSTÈME DE SANTÉ GÉNÉRAL
    const systemHealth = await getSystemHealth()

    console.log('✅ FIN: Toutes les métriques récupérées avec succès')

    return NextResponse.json({
      projects: projectsData,
      interestChecks: interestChecksData, // NOUVEAU
      facebookApi: facebookApiData, // AMÉLIORÉ  
      cache: cacheData,
      systemHealth
    })

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des métriques:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

/**
 * NOUVEAU: Métriques de performance pour les Interest Checks
 */
async function getInterestChecksPerformance() {
  console.log('📋 Récupération métriques Interest Checks...')

  try {
    // Compter les Interest Checks par statut
    const statusCounts = await prisma.interestCheck.groupBy({
      by: ['enrichmentStatus'],
      _count: { id: true }
    })

    // Interest Checks récents (7 derniers jours)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recentInterestChecks = await prisma.interestCheck.count({
      where: { createdAt: { gte: sevenDaysAgo } }
    })

    // Interest Checks actifs (processing, pending)
    const activeInterestChecks = await prisma.interestCheck.count({
      where: { enrichmentStatus: { in: ['processing', 'pending', 'in_progress'] } }
    })

    // Interest Checks en pause
    const pausedInterestChecks = await prisma.interestCheck.count({
      where: { enrichmentStatus: 'paused' }
    })

    // Métriques détaillées pour les Interest Checks actifs
    const activeDetails = await prisma.interestCheck.findMany({
      where: { enrichmentStatus: { in: ['processing', 'pending', 'in_progress'] } },
      select: {
        id: true,
        name: true,
        slug: true,
        enrichmentStatus: true,
        currentInterestIndex: true,
        createdAt: true,
        updatedAt: true,
        pausedAt: true,
        _count: { select: { interests: true } }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Intérêts avec et sans suggestions
    const interestsStats = await prisma.interest.groupBy({
      by: ['status'],
      _count: { id: true }
    })

    const totalInterests = await prisma.interest.count()

    // Performance par pays
    const performanceByCountry = await prisma.interestCheck.groupBy({
      by: ['country'],
      _count: { id: true },
      _avg: { currentInterestIndex: true }
    })

    console.log('✅ Métriques Interest Checks récupérées')

    return {
      total: statusCounts.reduce((sum, s) => sum + s._count.id, 0),
      byStatus: statusCounts.reduce((acc: any, curr: any) => {
        acc[curr.enrichmentStatus] = curr._count.id
        return acc
      }, {}),
      recent: recentInterestChecks,
      active: activeInterestChecks,
      paused: pausedInterestChecks,
      activeDetails,
      qualityMetrics: {
        totalInterests,
        withSuggestions: 0, // Placeholder - nécessite correction du schéma
        withoutSuggestions: totalInterests,
        byStatus: interestsStats.reduce((acc: any, curr: any) => {
          acc[curr.status] = curr._count.id
          return acc
        }, {}),
        avgQualityScore: 0, // Placeholder
        avgProcessingTime: 0 // Placeholder
      },
      performanceByCountry
    }

  } catch (error) {
    console.error('❌ Erreur métriques Interest Checks:', error)
    // Retourner des données par défaut en cas d'erreur
    return {
      total: 0,
      byStatus: {},
      recent: 0,
      active: 0,
      paused: 0,
      activeDetails: [],
      qualityMetrics: {
        totalInterests: 0,
        withSuggestions: 0,
        withoutSuggestions: 0,
        byStatus: {},
        avgQualityScore: 0,
        avgProcessingTime: 0
      },
      performanceByCountry: []
    }
  }
}

/**
 * AMÉLIORÉ: Métriques API Facebook (Projets + Interest Checks)
 */
async function getFacebookApiMetrics() {
  console.log('📊 Récupération métriques API Facebook...')

  try {
    // Métriques du cache Facebook
    const cacheStats = await prisma.facebookSuggestionCache.groupBy({
      by: ['country'],
      _count: { id: true }
    })

    const totalCacheEntries = await prisma.facebookSuggestionCache.count()
    const cacheHitsToday = await prisma.facebookSuggestionCache.count({
      where: {
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })

    // Usage estimé par type de requête
    const usageByType = {
      projects: {
        active: await prisma.project.count({
          where: { enrichmentStatus: { in: ['processing', 'pending'] } }
        }),
        estimated_requests_per_hour: 0
      },
      interestChecks: {
        active: await prisma.interestCheck.count({
          where: { enrichmentStatus: { in: ['processing', 'pending', 'in_progress'] } }
        }),
        estimated_requests_per_hour: 0
      }
    }

    // Calculer estimation pour les projets
    const activeProjects = await prisma.project.findMany({
      where: { enrichmentStatus: { in: ['processing', 'pending'] } },
      include: { _count: { select: { criteres: true } } }
    })

    usageByType.projects.estimated_requests_per_hour = activeProjects.reduce((sum, p) => {
      const pendingCriteres = p._count.criteres - (p.currentCategoryIndex || 0)
      return sum + Math.min(pendingCriteres, 50) // Max 50 req/h par projet
    }, 0)

    // Calculer estimation pour les Interest Checks
    const activeInterestChecks = await prisma.interestCheck.findMany({
      where: { enrichmentStatus: { in: ['processing', 'pending', 'in_progress'] } },
      include: { _count: { select: { interests: true } } }
    })

    usageByType.interestChecks.estimated_requests_per_hour = activeInterestChecks.reduce((sum, ic) => {
      const pendingInterests = ic._count.interests - (ic.currentInterestIndex || 0)
      return sum + Math.min(pendingInterests, 30) // Max 30 req/h par Interest Check
    }, 0)

    // Rate limit recommendations
    const totalEstimatedRequests = usageByType.projects.estimated_requests_per_hour + 
                                   usageByType.interestChecks.estimated_requests_per_hour

    let rateLimitRecommendation = 'safe'
    if (totalEstimatedRequests > 200) rateLimitRecommendation = 'danger'
    else if (totalEstimatedRequests > 100) rateLimitRecommendation = 'warning'

    console.log('✅ Métriques API Facebook récupérées')

    return {
      cache: {
        totalEntries: totalCacheEntries,
        byCountry: cacheStats.reduce((acc: any, curr: any) => {
          acc[curr.country] = curr._count.id
          return acc
        }, {}),
        hitsToday: cacheHitsToday,
        hitRate: totalCacheEntries > 0 ? (cacheHitsToday / totalCacheEntries * 100) : 0
      },
      usage: usageByType,
      estimatedRequestsPerHour: totalEstimatedRequests,
      rateLimitRecommendation,
      logs: {
        requests24h: 0,
        errors24h: 0,
        avgResponseTime: 0
      }
    }

  } catch (error) {
    console.error('❌ Erreur métriques API Facebook:', error)
    // Retourner des données par défaut en cas d'erreur
    return {
      cache: {
        totalEntries: 0,
        byCountry: {},
        hitsToday: 0,
        hitRate: 0
      },
      usage: {
        projects: { active: 0, estimated_requests_per_hour: 0 },
        interestChecks: { active: 0, estimated_requests_per_hour: 0 }
      },
      estimatedRequestsPerHour: 0,
      rateLimitRecommendation: 'safe',
      logs: {
        requests24h: 0,
        errors24h: 0,
        avgResponseTime: 0
      }
    }
  }
}

/**
 * Métriques de cache global
 */
async function getCacheMetrics() {
  console.log('📦 Récupération métriques de cache...')

  try {
    const totalEntries = await prisma.facebookSuggestionCache.count()
    const memoryStats = getCacheStats()

    console.log('✅ Métriques de cache récupérées')

    return {
      totalEntries,
      memoryEntries: memoryStats?.memoryEntries || 0
    }
  } catch (error) {
    console.error('❌ Erreur métriques de cache:', error)
    return {
      totalEntries: 0,
      memoryEntries: 0
    }
  }
}

/**
 * Système de santé général
 */
async function getSystemHealth() {
  console.log('💪 Vérification du système de santé...')

  try {
    // Vérifier la disponibilité de la base de données
    await prisma.$queryRaw`SELECT 1`
    const dbStatus = 'OK'

    // Vérifier la disponibilité de l'API Facebook
    const facebookApiStatus = 'OK' // Placeholder, à remplacer par une vérification réelle

    // Vérifier la disponibilité de la mémoire
    const memoryStatus = 'OK' // Placeholder, à remplacer par une vérification réelle

    console.log('✅ Vérification du système de santé terminée')

    return {
      dbStatus,
      facebookApiStatus,
      memoryStatus
    }
  } catch (error) {
    console.error('❌ Erreur système de santé:', error)
    return {
      dbStatus: 'ERROR',
      facebookApiStatus: 'ERROR',
      memoryStatus: 'ERROR'
    }
  }
}

/**
 * Métriques de performance pour les projets (existantes)
 */
async function getProjectsPerformance() {
  console.log('📊 Récupération métriques de performance des projets...')

  try {
    // Compter les projets par statut
    const statusCounts = await prisma.project.groupBy({
      by: ['enrichmentStatus'],
      _count: { id: true }
    })

    // Projets récents (7 derniers jours)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recentProjects = await prisma.project.count({
      where: { createdAt: { gte: sevenDaysAgo } }
    })

    // Projets actifs (processing, pending)
    const activeProjects = await prisma.project.count({
      where: { enrichmentStatus: { in: ['processing', 'pending'] } }
    })

    // Projets en pause
    const pausedProjects = await prisma.project.count({
      where: { enrichmentStatus: 'paused' }
    })

    // Métriques détaillées pour les projets actifs
    const activeDetails = await prisma.project.findMany({
      where: { enrichmentStatus: { in: ['processing', 'pending'] } },
      select: {
        id: true,
        name: true,
        slug: true,
        enrichmentStatus: true,
        currentCategoryIndex: true,
        createdAt: true,
        updatedAt: true,
        pausedAt: true,
        _count: { select: { criteres: true } }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Critères avec et sans suggestions (corrigé)
    const criteresStats = await prisma.critere.groupBy({
      by: ['status'],
      _count: { id: true }
    })

    const criteresWithSuggestions = await prisma.critere.count({
      where: {
        suggestions: { some: {} }
      }
    })

    const totalCriteres = await prisma.critere.count()

    // Quality score moyen pour les projets (corrigé)
    const avgQualityScore = await prisma.$queryRaw`
      SELECT AVG(
        CASE 
          WHEN suggestion_count = 0 THEN 0
          ELSE (high_quality_count::float / suggestion_count::float) * 100
        END
      ) as avg_quality_score
      FROM (
        SELECT 
          c.id,
          COUNT(sf.id) as suggestion_count,
          COUNT(CASE WHEN sf."similarityScore" >= 60 THEN 1 END) as high_quality_count
        FROM "Critere" c
        LEFT JOIN "SuggestionFacebook" sf ON c.id = sf."critereId"
        GROUP BY c.id
      ) stats
    `

    // Temps de traitement moyen
    const avgProcessingTime = await prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt"))) as avg_seconds
      FROM "Project"
      WHERE "enrichmentStatus" = 'done'
      AND "updatedAt" > NOW() - INTERVAL '30 days'
    `

    // Performance par pays
    const performanceByCountry = await prisma.project.groupBy({
      by: ['country'],
      _count: { id: true },
      _avg: { currentCategoryIndex: true }
    })

    console.log('✅ Métriques de performance des projets récupérées')

    return {
      total: statusCounts.reduce((sum, s) => sum + s._count.id, 0),
      byStatus: statusCounts.reduce((acc: any, curr: any) => {
        acc[curr.enrichmentStatus] = curr._count.id
        return acc
      }, {}),
      recent: recentProjects,
      active: activeProjects,
      paused: pausedProjects,
      activeDetails,
      qualityMetrics: {
        totalProjects: totalCriteres,
        withSuggestions: criteresWithSuggestions,
        withoutSuggestions: totalCriteres - criteresWithSuggestions,
        byStatus: criteresStats.reduce((acc: any, curr: any) => {
          acc[curr.status] = curr._count.id
          return acc
        }, {}),
        avgQualityScore: (avgQualityScore as any)?.[0]?.avg_quality_score || 0,
        avgProcessingTime: (avgProcessingTime as any)?.[0]?.avg_seconds || 0
      },
      performanceByCountry
    }

  } catch (error) {
    console.error('❌ Erreur métriques de performance des projets:', error)
    // Retourner des données par défaut en cas d'erreur
    return {
      total: 0,
      byStatus: {},
      recent: 0,
      active: 0,
      paused: 0,
      activeDetails: [],
      qualityMetrics: {
        totalProjects: 0,
        withSuggestions: 0,
        withoutSuggestions: 0,
        byStatus: {},
        avgQualityScore: 0,
        avgProcessingTime: 0
      },
      performanceByCountry: []
    }
  }
} 