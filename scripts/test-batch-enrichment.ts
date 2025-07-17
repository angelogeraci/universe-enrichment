#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma'

async function testBatchEnrichment() {
  try {
    console.log('🚀 DIAGNOSTIC BATCH ENRICHMENT')
    
    // 1. Vérifier les Interest Checks disponibles
    const interestChecks = await prisma.interestCheck.findMany({
      include: {
        interests: {
          take: 5,
          where: {
            status: { in: ['pending', 'failed'] }
          }
        },
        _count: {
          select: { interests: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`📋 Interest Checks trouvés: ${interestChecks.length}`)
    
    for (const check of interestChecks) {
      console.log(`  - ${check.name} (${check.slug}): ${check._count.interests} intérêts, statut: ${check.enrichmentStatus}`)
    }

    if (interestChecks.length === 0) {
      console.log('❌ Aucun Interest Check trouvé')
      return
    }

    // 2. Tester avec le premier Interest Check qui a des intérêts pending
    const targetCheck = interestChecks.find(check => 
      check.interests.length > 0 && 
      check.enrichmentStatus !== 'in_progress'
    )

    if (!targetCheck) {
      console.log('❌ Aucun Interest Check approprié pour le test')
      return
    }

    console.log(`\n🎯 Test avec: ${targetCheck.name} (${targetCheck.slug})`)
    console.log(`📊 Intérêts disponibles: ${targetCheck.interests.length}`)

    // 3. Tester l'API Progress
    const testUrl = `http://localhost:3000/api/interests-check/${targetCheck.slug}/progress`
    console.log(`🌐 Test API Progress: ${testUrl}`)

    try {
      const progressResponse = await fetch(testUrl)
      console.log(`📊 Status Progress API: ${progressResponse.status}`)
      
      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        console.log('✅ Données de progression:', JSON.stringify(progressData, null, 2))
      } else {
        const errorText = await progressResponse.text()
        console.log('❌ Erreur Progress API:', errorText)
      }
    } catch (error) {
      console.log('❌ Exception Progress API:', error)
    }

    // 4. Tester l'API Batch Enrichment (simulation)
    const batchUrl = `http://localhost:3000/api/interests-check/${targetCheck.slug}/batch-enrichment`
    console.log(`\n🌐 Test API Batch Enrichment: ${batchUrl}`)

    const interestIds = targetCheck.interests.slice(0, 2).map(i => i.id) // Test avec seulement 2 intérêts
    
    console.log('📡 Tentative d\'appel API Batch (simulation)...')
    console.log('📋 IDs des intérêts:', interestIds)
    
    // NOTE: Pour un vrai test, il faudrait inclure les headers d'authentification
    console.log('⚠️ Test simulation seulement - authentification requise pour un vrai test')

    // 5. Vérifier l'état de la base de données
    console.log('\n📊 ÉTAT DE LA BASE:')
    
    const totalInterests = await prisma.interest.count()
    const pendingInterests = await prisma.interest.count({ where: { status: 'pending' } })
    const inProgressInterests = await prisma.interest.count({ where: { status: 'in_progress' } })
    const doneInterests = await prisma.interest.count({ where: { status: 'done' } })
    const failedInterests = await prisma.interest.count({ where: { status: 'failed' } })

    console.log(`  Total intérêts: ${totalInterests}`)
    console.log(`  Pending: ${pendingInterests}`)
    console.log(`  In Progress: ${inProgressInterests}`)
    console.log(`  Done: ${doneInterests}`)
    console.log(`  Failed: ${failedInterests}`)

    // 6. Vérifier les suggestions existantes
    const totalSuggestions = await prisma.interestSuggestion.count()
    console.log(`  Total suggestions: ${totalSuggestions}`)

  } catch (error) {
    console.error('❌ ERREUR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Fonction pour simuler un batch enrichment local
async function simulateBatchEnrichment() {
  try {
    console.log('\n🔬 SIMULATION BATCH ENRICHMENT LOCAL')
    
    const interestCheck = await prisma.interestCheck.findFirst({
      where: {
        enrichmentStatus: { not: 'in_progress' }
      },
      include: {
        interests: {
          take: 3,
          where: { status: 'pending' }
        }
      }
    })

    if (!interestCheck || interestCheck.interests.length === 0) {
      console.log('❌ Aucun Interest Check approprié pour la simulation')
      return
    }

    console.log(`🎯 Simulation avec: ${interestCheck.name}`)
    console.log(`📊 Intérêts à traiter: ${interestCheck.interests.length}`)

    // Simuler le début du batch
    await prisma.interestCheck.update({
      where: { id: interestCheck.id },
      data: { 
        enrichmentStatus: 'in_progress',
        currentInterestIndex: 0
      }
    })

    console.log('✅ Interest Check marqué comme "in_progress"')

    // Simuler le traitement de chaque intérêt
    for (const [index, interest] of interestCheck.interests.entries()) {
      console.log(`🔄 Simulation traitement: ${interest.name} (${index + 1}/${interestCheck.interests.length})`)
      
      // Marquer comme en cours
      await prisma.interest.update({
        where: { id: interest.id },
        data: { status: 'in_progress' }
      })

      // Mettre à jour la progression
      await prisma.interestCheck.update({
        where: { id: interestCheck.id },
        data: { currentInterestIndex: index }
      })

      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Marquer comme terminé
      await prisma.interest.update({
        where: { id: interest.id },
        data: { status: 'done' }
      })

      console.log(`✅ ${interest.name} marqué comme "done"`)
    }

    // Finaliser le batch
    await prisma.interestCheck.update({
      where: { id: interestCheck.id },
      data: { 
        enrichmentStatus: 'done',
        currentInterestIndex: interestCheck.interests.length
      }
    })

    console.log('🎉 Simulation terminée - Interest Check marqué comme "done"')

  } catch (error) {
    console.error('❌ ERREUR SIMULATION:', error)
  }
}

async function main() {
  await testBatchEnrichment()
  
  console.log('\n' + '='.repeat(50))
  const shouldSimulate = process.argv.includes('--simulate')
  
  if (shouldSimulate) {
    await simulateBatchEnrichment()
  } else {
    console.log('💡 Pour lancer une simulation: npm run test:batch -- --simulate')
  }
}

main().catch(console.error) 