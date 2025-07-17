#!/usr/bin/env npx tsx

import { prisma } from '../src/lib/prisma'

interface OptimizationProfile {
  name: string
  batchSize: number
  pauseMs: number
  description: string
  parallel?: boolean
}

const PROFILES: Record<string, OptimizationProfile> = {
  conservative: {
    name: 'Conservateur',
    batchSize: 50,
    pauseMs: 3000,
    description: 'Configuration sécurisée pour éviter les rate limits'
  },
  balanced: {
    name: 'Équilibré',
    batchSize: 100,
    pauseMs: 1500,
    description: 'Bon compromis vitesse/sécurité'
  },
  fast: {
    name: 'Rapide',
    batchSize: 150,
    pauseMs: 800,
    description: 'Configuration optimisée pour la vitesse'
  },
  aggressive: {
    name: 'Agressif',
    batchSize: 200,
    pauseMs: 500,
    description: 'Vitesse maximale (risque de rate limit)'
  }
}

async function applySetting(key: string, value: string) {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  })
  console.log(`✅ ${key}: ${value}`)
}

async function optimizeSettings(profile: string = 'fast') {
  console.log('🚀 OPTIMISATION DES PERFORMANCES FACEBOOK')
  console.log('============================================')
  
  const config = PROFILES[profile]
  if (!config) {
    console.error(`❌ Profil inconnu: ${profile}`)
    console.log('Profils disponibles:', Object.keys(PROFILES).join(', '))
    return
  }
  
  console.log(`📊 Application du profil: ${config.name}`)
  console.log(`📝 Description: ${config.description}`)
  console.log('')
  
  // Appliquer les paramètres optimisés
  await applySetting('facebookBatchSize', config.batchSize.toString())
  await applySetting('facebookPauseMs', config.pauseMs.toString())
  
  // Optimiser le seuil de pertinence pour plus de suggestions
  await applySetting('facebookRelevanceScoreThreshold', '0.25')
  
  console.log('')
  console.log('🎯 OPTIMISATIONS APPLIQUÉES:')
  console.log(`• Batch size: ${config.batchSize} requêtes par lot`)
  console.log(`• Pause: ${config.pauseMs}ms entre les lots`)
  console.log(`• Seuil pertinence: 0.25 (plus de suggestions)`)
  console.log('')
  
  // Calculer les gains de performance estimés
  const estimatedTimePerBatch = config.pauseMs + (config.batchSize * 100) // ~100ms par requête
  const requestsPerMinute = Math.floor(60000 / estimatedTimePerBatch * config.batchSize)
  
  console.log('📈 ESTIMATION DE PERFORMANCE:')
  console.log(`• ~${requestsPerMinute} requêtes/minute`)
  console.log(`• ~${Math.floor(requestsPerMinute * 60)} requêtes/heure maximum`)
  console.log('')
  
  if (profile === 'aggressive') {
    console.log('⚠️  ATTENTION: Profil agressif activé')
    console.log('   Surveillez les logs pour détecter les rate limits')
  }
  
  console.log('✅ Optimisation terminée ! Redémarrez vos enrichissements.')
}

async function analyzeCurrentPerformance() {
  console.log('📊 ANALYSE DES PERFORMANCES ACTUELLES')
  console.log('=====================================')
  
  // Récupérer les paramètres actuels
  const settings = await prisma.appSetting.findMany({
    where: { key: { in: ['facebookBatchSize', 'facebookPauseMs'] } }
  })
  
  const currentBatch = Number(settings.find(s => s.key === 'facebookBatchSize')?.value || '100')
  const currentPause = Number(settings.find(s => s.key === 'facebookPauseMs')?.value || '2000')
  
  console.log('🔧 Paramètres actuels:')
  console.log(`• Batch size: ${currentBatch}`)
  console.log(`• Pause: ${currentPause}ms`)
  
  // Analyser l'usage du cache
  const cacheEntries = await prisma.facebookSuggestionCache.count()
  const recentCache = await prisma.facebookSuggestionCache.count({
    where: {
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  })
  
  console.log('')
  console.log('💾 Cache Facebook:')
  console.log(`• Total entrées: ${cacheEntries}`)
  console.log(`• Nouvelles 24h: ${recentCache}`)
  console.log(`• Taux de réutilisation: ${cacheEntries > 0 ? Math.round((cacheEntries - recentCache) / cacheEntries * 100) : 0}%`)
  
  // Recommandations
  console.log('')
  console.log('💡 RECOMMANDATIONS:')
  
  if (currentBatch < 100) {
    console.log('• ⬆️  Augmenter le batch size pour plus de débit')
  }
  if (currentPause > 2000) {
    console.log('• ⬇️  Réduire la pause pour accélérer le traitement')
  }
  if (cacheEntries < 100) {
    console.log('• 🔄 Laisser le cache se construire pour des gains futurs')
  }
  
  console.log('')
}

async function main() {
  try {
    const args = process.argv.slice(2)
    const command = args[0] || 'analyze'
    const profile = args[1] || 'fast'
    
    switch (command) {
      case 'analyze':
        await analyzeCurrentPerformance()
        console.log('💡 Pour optimiser: npm run optimize-performance apply [conservative|balanced|fast|aggressive]')
        break
      case 'apply':
        await optimizeSettings(profile)
        break
      case 'profiles':
        console.log('📋 PROFILS D\'OPTIMISATION DISPONIBLES:')
        console.log('======================================')
        Object.entries(PROFILES).forEach(([key, config]) => {
          console.log(`• ${key}: ${config.name}`)
          console.log(`  ${config.description}`)
          console.log(`  Batch: ${config.batchSize}, Pause: ${config.pauseMs}ms`)
          console.log('')
        })
        break
      default:
        console.log('Usage: npm run optimize-performance [analyze|apply|profiles] [profile]')
    }
  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main() 