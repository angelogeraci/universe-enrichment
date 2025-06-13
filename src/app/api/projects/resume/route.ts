import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper pour charger les settings dynamiquement (copié depuis projects/route.ts)
async function getAppSettings() {
  const settings = await prisma.appSetting.findMany({
    where: { key: { in: [
      'facebookBatchSize',
      'facebookPauseMs',
      'facebookRelevanceScoreThreshold'
    ] } }
  })
  const map: Record<string, string> = {}
  for (const s of settings) map[s.key] = s.value
  return {
    facebookBatchSize: Number(map.facebookBatchSize ?? 100),
    facebookPauseMs: Number(map.facebookPauseMs ?? 5000),
    facebookRelevanceScoreThreshold: Number(map.facebookRelevanceScoreThreshold ?? 0.3)
  }
}

// Fonction d'enrichissement (copiée et adaptée depuis projects/route.ts)
async function resumeEnrichment(project: any, categories: any[], req: NextRequest) {
  console.log('🔄 REPRISE ENRICHISSEMENT pour', project.name)
  console.log('📋 CATÉGORIES À TRAITER:', categories.map(c => c.name))

  let hasError = false
  let processedCount = 0

  // Construire l'URL de base à partir de la requête courante
  const protocol = req.headers.get('x-forwarded-proto') || 'http'
  const host = req.headers.get('host') || 'localhost:3000'
  const baseUrl = `${protocol}://${host}`

  // Vérifier le statut du projet au début
  const currentProject = await prisma.project.findUnique({ where: { id: project.id } })
  if (!currentProject || ['cancelled', 'paused'].includes(currentProject.enrichmentStatus)) {
    console.log('🛑 Enrichissement arrêté:', currentProject?.enrichmentStatus)
    return
  }

  // ÉTAPE 1: Enrichissement IA - reprendre à partir de currentCategoryIndex
  console.log('🤖 PHASE 1: ENRICHISSEMENT IA (REPRISE)')
  const startIndex = currentProject.currentCategoryIndex || 0
  console.log(`📍 Reprise à partir de l'index: ${startIndex}`)
  
  // Si on a déjà tous les critères, passer directement au Facebook
  const existingCriteres = await prisma.critere.count({ where: { projectId: project.id } })
  const shouldSkipAI = existingCriteres > 0 && startIndex >= categories.length
  
  if (!shouldSkipAI) {
    for (let i = startIndex; i < categories.length; i++) {
      const category = categories[i]
      
      // Vérifier le statut avant chaque catégorie
      const projectStatus = await prisma.project.findUnique({ where: { id: project.id } })
      if (!projectStatus || ['cancelled', 'paused'].includes(projectStatus.enrichmentStatus)) {
        console.log('🛑 Enrichissement interrompu à la catégorie:', category.name)
        return
      }

      try {
        console.log(`🔄 TRAITEMENT CATÉGORIE: ${category.name} (${i + 1}/${categories.length})`)

        // Mettre à jour le statut avec progression détaillée
        await prisma.project.update({
          where: { id: project.id },
          data: { 
            enrichmentStatus: 'processing',
            currentCategoryIndex: i
          }
        })

        // Appel à l'API d'enrichissement
        const enrichmentResponse = await fetch(`${baseUrl}/api/enrichment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project: { id: project.id, searchType: project.searchType },
            category: category.name,
            categoryPath: category.path,
            country: project.country
          })
        })

        const enrichmentData = await enrichmentResponse.json()
        console.log(`✅ RÉPONSE ENRICHISSEMENT ${category.name}:`, enrichmentData)

        if (!enrichmentResponse.ok) {
          console.log(`❌ ERREUR ENRICHISSEMENT ${category.name}:`, enrichmentData)
          hasError = true
        } else {
          processedCount++
          console.log(`✅ SUCCÈS ${category.name} - ${processedCount}/${categories.length}`)
        }
      } catch (error) {
        console.error(`❌ EXCEPTION ENRICHISSEMENT ${category.name}:`, error)
        hasError = true
      }
    }
  } else {
    console.log('⏭️ Phase IA déjà terminée, passage direct au Facebook')
  }

  // ÉTAPE 2: Suggestions Facebook
  const projectBeforeFacebook = await prisma.project.findUnique({ where: { id: project.id } })
  if (!projectBeforeFacebook || ['cancelled', 'paused'].includes(projectBeforeFacebook.enrichmentStatus)) {
    console.log('🛑 Enrichissement arrêté avant la phase Facebook')
    return
  }

  console.log('🔍 PHASE 2: ENRICHISSEMENT SUGGESTIONS FACEBOOK (REPRISE)')
  const allCriteres = await prisma.critere.findMany({
    where: { projectId: project.id },
    include: { suggestions: true },
    orderBy: { createdAt: 'asc' }
  })

  console.log(`📊 TOTAL CRITÈRES GÉNÉRÉS: ${allCriteres.length}`)
  
  // Charger dynamiquement les settings
  const { facebookBatchSize, facebookPauseMs, facebookRelevanceScoreThreshold } = await getAppSettings()
  let facebookProcessedCount = 0

  for (const critere of allCriteres) {
    // Vérifier le statut avant chaque critère Facebook
    const projectStatus = await prisma.project.findUnique({ where: { id: project.id } })
    if (!projectStatus || ['cancelled', 'paused'].includes(projectStatus.enrichmentStatus)) {
      console.log('🛑 Enrichissement Facebook interrompu:', critere.label)
      return
    }

    // Skip si le critère a déjà des suggestions
    if (critere.suggestions && critere.suggestions.length > 0) {
      facebookProcessedCount++
      console.log(`⏭️ SKIP ${critere.label} (déjà traité)`)
      continue
    }

    try {
      console.log(`🔄 RECHERCHE FACEBOOK: ${critere.label}`)

      const facebookResponse = await fetch(`${baseUrl}/api/facebook/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          critereId: critere.id,
          query: critere.label,
          country: critere.country,
          relevanceScoreThreshold: facebookRelevanceScoreThreshold
        })
      })

      const facebookData = await facebookResponse.json()

      if (facebookResponse.ok) {
        facebookProcessedCount++
        console.log(`✅ SUGGESTIONS FACEBOOK ${critere.label}: ${facebookData.totalFound || 0} trouvées`)
      } else {
        console.log(`❌ ERREUR FACEBOOK ${critere.label}:`, facebookData.error)
      }

      // Pause courte entre les requêtes
      await new Promise(resolve => setTimeout(resolve, 100))

      // PAUSE LONGUE toutes les facebookBatchSize requêtes
      if (facebookProcessedCount > 0 && facebookProcessedCount % facebookBatchSize === 0) {
        console.log(`⏸️ Pause Facebook de ${facebookPauseMs / 1000}s après ${facebookBatchSize} requêtes...`)
        
        // Vérifier le statut AVANT la pause longue
        const statusBeforePause = await prisma.project.findUnique({ where: { id: project.id } })
        if (!statusBeforePause || ['cancelled', 'paused'].includes(statusBeforePause.enrichmentStatus)) {
          console.log('🛑 Enrichissement arrêté pendant la pause Facebook')
          return
        }
        
        // Mettre à jour le statut pour indiquer qu'on est toujours en processing
        await prisma.project.update({
          where: { id: project.id },
          data: { 
            enrichmentStatus: 'processing',
            updatedAt: new Date() // Important pour la détection de pause Facebook
          }
        })
        
        // Attendre la pause
        await new Promise(resolve => setTimeout(resolve, facebookPauseMs))
        
        // Vérifier le statut APRÈS la pause longue 
        const statusAfterPause = await prisma.project.findUnique({ where: { id: project.id } })
        if (!statusAfterPause || ['cancelled', 'paused'].includes(statusAfterPause.enrichmentStatus)) {
          console.log('🛑 Enrichissement arrêté après la pause Facebook')
          return
        }
        
        console.log(`▶️ Reprise après pause Facebook (${facebookProcessedCount}/${allCriteres.length} traités)`)
      }

    } catch (error) {
      console.error(`❌ EXCEPTION FACEBOOK ${critere.label}:`, error)
    }
  }

  console.log(`🎉 SUGGESTIONS FACEBOOK: ${facebookProcessedCount}/${allCriteres.length} critères traités`)

  // Marquer le projet comme terminé
  const totalCategories = categories.length
  const failedCount = totalCategories - processedCount
  let finalStatus = 'done'
  if (processedCount === 0) {
    finalStatus = 'error'
  }
  if (failedCount > 0) {
    console.warn(`⚠️ ${failedCount} catégories IA ont échoué sur ${totalCategories}`)
  }
  console.log(`🏁 ENRICHISSEMENT TERMINÉ - Status: ${finalStatus}`)

  await prisma.project.update({
    where: { id: project.id },
    data: { enrichmentStatus: finalStatus }
  })

  console.log(`🎉 Enrichissement terminé pour le projet ${project.name}`)
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, categories } = await req.json()

    if (!projectId || !categories) {
      return NextResponse.json({ error: 'projectId et categories requis' }, { status: 400 })
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }

    console.log('🚀 DÉMARRAGE REPRISE ENRICHISSEMENT:', project.name)

    // Déclencher la reprise en arrière-plan
    resumeEnrichment(project, categories, req)
      .catch(err => {
        console.error('❌ ERREUR REPRISE ENRICHISSEMENT:', err)
        // Marquer le projet en erreur si quelque chose se passe mal
        prisma.project.update({
          where: { id: projectId },
          data: { enrichmentStatus: 'error' }
        }).catch(console.error)
      })

    return NextResponse.json({ message: 'Reprise de l\'enrichissement démarrée' })
  } catch (error) {
    console.error('Erreur lors de la reprise:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
} 