#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface OptimizationConfig {
  name: string
  batchSize: number
  pauseMs: number
  relevanceThreshold: number
  description: string
}

const OPTIMIZATION_CONFIGS: Record<string, OptimizationConfig> = {
  development: {
    name: 'Development (Sécurisé)',
    batchSize: 25,
    pauseMs: 3000,
    relevanceThreshold: 0.3,
    description: 'Configuration sécurisée pour développement'
  },
  standard: {
    name: 'Standard (Optimisé)',
    batchSize: 150,
    pauseMs: 1000,
    relevanceThreshold: 0.6,
    description: 'Configuration optimisée pour usage normal'
  },
  aggressive: {
    name: 'Aggressive (Haute Performance)',
    batchSize: 200,
    pauseMs: 500,
    relevanceThreshold: 0.7,
    description: 'Configuration haute performance (risque rate limit)'
  }
}

async function analyzeCurrentUsage() {
  console.log('📊 Analyse de l\'usage actuel...')

  // PROJETS
  const projectStats = {
    active: await prisma.project.count({
      where: { enrichmentStatus: { in: ['processing', 'pending'] } }
    }),
    total: await prisma.project.count(),
    avgCriteres: await prisma.project.aggregate({
      _avg: { currentCategoryIndex: true }
    })
  }

  // INTEREST CHECKS (NOUVEAU)
  const interestCheckStats = {
    active: await prisma.interestCheck.count({
      where: { enrichmentStatus: { in: ['processing', 'pending', 'in_progress'] } }
    }),
    total: await prisma.interestCheck.count(),
    avgInterests: await prisma.interestCheck.aggregate({
      _avg: { currentInterestIndex: true }
    })
  }

  // Estimations de requêtes
  const activeProjects = await prisma.project.findMany({
    where: { enrichmentStatus: { in: ['processing', 'pending'] } },
    include: { _count: { select: { criteres: true } } }
  })

  const activeInterestChecks = await prisma.interestCheck.findMany({
    where: { enrichmentStatus: { in: ['processing', 'pending', 'in_progress'] } },
    include: { _count: { select: { interests: true } } }
  })

  const projectRequestsPerHour = activeProjects.reduce((sum: number, p: any) => {
    const remaining = p._count.criteres - (p.currentCategoryIndex || 0)
    return sum + Math.min(remaining, 50) // Max 50 req/h par projet
  }, 0)

  const interestCheckRequestsPerHour = activeInterestChecks.reduce((sum: number, ic: any) => {
    const remaining = ic._count.interests - (ic.currentInterestIndex || 0)
    return sum + Math.min(remaining, 30) // Max 30 req/h par Interest Check
  }, 0)

  const totalEstimatedRequests = projectRequestsPerHour + interestCheckRequestsPerHour

  console.log('\n📈 STATISTIQUES ACTUELLES:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📋 PROJETS:`)
  console.log(`   • Actifs: ${projectStats.active}/${projectStats.total}`)
  console.log(`   • Requêtes/h estimées: ${projectRequestsPerHour}`)
  console.log('')
  console.log(`🔍 INTEREST CHECKS:`)
  console.log(`   • Actifs: ${interestCheckStats.active}/${interestCheckStats.total}`)
  console.log(`   • Requêtes/h estimées: ${interestCheckRequestsPerHour}`)
  console.log('')
  console.log(`🚀 ESTIMATION TOTALE: ${totalEstimatedRequests} requêtes/h`)
  console.log('')

  // Recommandations
  let recommendedConfig = 'development'
  if (totalEstimatedRequests < 50) {
    recommendedConfig = 'aggressive'
  } else if (totalEstimatedRequests < 150) {
    recommendedConfig = 'standard'
  }

  console.log(`💡 RECOMMANDATION: ${OPTIMIZATION_CONFIGS[recommendedConfig].name}`)
  console.log(`   ${OPTIMIZATION_CONFIGS[recommendedConfig].description}`)
  console.log('')

  return {
    projectStats,
    interestCheckStats,
    totalEstimatedRequests,
    recommendedConfig
  }
}

async function applySetting(key: string, value: string) {
  try {
    await prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    })
    console.log(`✅ ${key} = ${value}`)
  } catch (error) {
    console.error(`❌ Erreur pour ${key}:`, error)
  }
}

async function applyOptimization(configName?: string) {
  console.log('⚙️ Application de l\'optimisation...')

  const analysis = await analyzeCurrentUsage()
  const targetConfig = configName || analysis.recommendedConfig
  const config = OPTIMIZATION_CONFIGS[targetConfig]

  if (!config) {
    console.error(`❌ Configuration inconnue: ${targetConfig}`)
    console.log('📋 Configurations disponibles:', Object.keys(OPTIMIZATION_CONFIGS).join(', '))
    return
  }

  console.log(`🎯 Application de la configuration: ${config.name}`)
  console.log('')

  // Appliquer les paramètres
  await applySetting('facebookBatchSize', config.batchSize.toString())
  await applySetting('facebookPauseMs', config.pauseMs.toString())
  await applySetting('facebookRelevanceScoreThreshold', config.relevanceThreshold.toString())

  // Paramètres spécifiques aux Interest Checks
  await applySetting('interestCheckBatchSize', Math.floor(config.batchSize * 0.7).toString()) // 70% du batch size des projets
  await applySetting('interestCheckPauseMs', (config.pauseMs + 500).toString()) // +500ms pour les Interest Checks
  await applySetting('interestCheckRelevanceThreshold', config.relevanceThreshold.toString())

  console.log('')
  console.log('✅ Optimisation appliquée avec succès!')
  console.log('')
  console.log(`📊 Nouvelle estimation:`)
  console.log(`   • Projets: ${analysis.totalEstimatedRequests - (analysis.interestCheckStats.active * 10)} req/h`)
  console.log(`   • Interest Checks: ${analysis.interestCheckStats.active * 10} req/h`)
  console.log(`   • Total optimisé: ~${Math.floor(analysis.totalEstimatedRequests * 0.8)} req/h`)
  console.log('')

  // Recommandations additionnelles
  if (analysis.totalEstimatedRequests > 200) {
    console.log('⚠️  ATTENTION: Usage très élevé détecté')
    console.log('   • Surveillez les rate limits Facebook')
    console.log('   • Considérez espacer vos traitements')
  } else if (analysis.totalEstimatedRequests > 100) {
    console.log('⚠️  ATTENTION: Usage modéré')
    console.log('   • Surveillez les performances')
  } else {
    console.log('✅ Usage dans les limites recommandées')
  }
}

async function main() {
  try {
    console.log('🔧 OPTIMISEUR FACEBOOK API - Projets & Interest Checks')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')

    const args = process.argv.slice(2)
    const configName = args[0]

    if (configName && !OPTIMIZATION_CONFIGS[configName]) {
      console.log('📋 Configurations disponibles:')
      Object.entries(OPTIMIZATION_CONFIGS).forEach(([key, config]) => {
        console.log(`   • ${key}: ${config.name}`)
        console.log(`     ${config.description}`)
        console.log('')
      })
      return
    }

    if (configName === 'analyze' || !configName) {
      await analyzeCurrentUsage()
      if (!configName) {
        console.log('💡 Pour appliquer une configuration:')
        console.log('   npx tsx scripts/optimize-facebook-settings.ts [development|standard|aggressive]')
      }
    } else {
      await applyOptimization(configName)
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'optimisation:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main() 