import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createSlug } from '@/lib/utils'
import { facebookLogger } from '@/lib/facebook-logger'

// Paramètres de crawl Facebook (à rendre dynamiques via settings plus tard)
const FACEBOOK_BATCH_SIZE = 100 // nombre de requêtes avant pause
const FACEBOOK_PAUSE_MS = 5000  // durée de la pause en ms

export async function POST (req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await req.json()
    const { name, description, country, searchType, categoryListId } = body
    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }
    if (!country || !searchType || !categoryListId) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    const slug = createSlug(name)
    const existingProject = await prisma.project.findFirst({ where: { slug } })
    if (existingProject) {
      return NextResponse.json({ error: 'Un projet avec ce nom existe déjà' }, { status: 400 })
    }

    // Créer le projet avec statut 'processing' pour déclencher l'enrichissement automatique
    const project = await prisma.project.create({
      data: {
        name,
        slug,
        description,
        country,
        searchType,
        categoryListId,
        ownerId: session.user.id,
        enrichmentStatus: 'processing' // Status processing pour déclencher l'enrichissement
      },
      include: {
        categoryList: {
          include: { categories: true }
        }
      }
    })

    console.log('🚀 PROJECT CREATED:', project.name, 'ID:', project.id)
    console.log('📁 CATÉGORIES TROUVÉES:', project.categoryList.categories.length)

    // Déclencher l'enrichissement automatique en arrière-plan
    triggerEnrichment(project, project.categoryList.categories, req)
      .catch(err => {
        console.error('❌ GLOBAL ENRICHMENT ERROR:', err)
      })

    return NextResponse.json({ message: 'Project created successfully', project })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Helper pour charger les settings dynamiquement
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

async function triggerEnrichment(project: any, categories: any[], req: NextRequest) {
  console.log('🎯 DÉMARRAGE ENRICHISSEMENT pour', project.name)
  console.log('📋 CATÉGORIES À TRAITER:', categories.map(c => c.name))

  let hasError = false
  let processedCount = 0
  let totalSteps = 0

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

  // ÉTAPE 1: Enrichissement IA (génération des critères) - reprendre à partir de currentCategoryIndex
  console.log('🤖 PHASE 1: ENRICHISSEMENT IA')
  const startIndex = currentProject.currentCategoryIndex || 0
  console.log(`📍 Reprise à partir de l'index: ${startIndex}`)
  
  // Si on a déjà tous les critères (reprise après phase IA), passer directement au Facebook
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

        // Appel à l'API d'enrichissement avec URL dynamique
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

  // Vérifier le statut avant la phase Facebook
  const projectBeforeFacebook = await prisma.project.findUnique({ where: { id: project.id } })
  if (!projectBeforeFacebook || ['cancelled', 'paused'].includes(projectBeforeFacebook.enrichmentStatus)) {
    console.log('🛑 Enrichissement arrêté avant la phase Facebook')
    return
  }

  // ÉTAPE 2: Récupération de tous les critères générés
  console.log('📋 PHASE 2: RÉCUPÉRATION DES CRITÈRES "pending" ou "retry"')
  let criteresToProcess = await prisma.critere.findMany({
    where: { projectId: project.id, status: { in: ["pending", "retry"] } },
    orderBy: { createdAt: 'asc' }
  })
  totalSteps = criteresToProcess.length
  let facebookProcessedCount = 0
  const facebookFailed: { label: string, error: string }[] = []
  const { facebookBatchSize, facebookPauseMs, facebookRelevanceScoreThreshold } = await getAppSettings();

  // ✅ NOUVELLE APPROCHE: TRAITEMENT EN BATCH OPTIMISÉ
  console.log('🚀 DÉBUT TRAITEMENT FACEBOOK EN BATCH OPTIMISÉ')
  
  while (criteresToProcess.length > 0) {
    const batchSize = Math.min(facebookBatchSize, criteresToProcess.length)
    const batch = criteresToProcess.slice(0, batchSize)
    
    console.log(`📦 TRAITEMENT BATCH: ${batch.length} critères (${facebookProcessedCount}/${totalSteps} traités)`)
    
    // Préparer les requêtes batch
    const batchRequests = batch.map(critere => ({
      critereId: critere.id,
      searchTerm: critere.label,
      country: critere.country
    }))
    
    try {
      // Appel à la nouvelle API batch
      const batchResponse = await fetch(`${baseUrl}/api/facebook/suggestions/batch`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Log-Type': 'AUTO_ENRICHMENT',
          'X-Project-Slug': project.slug,
          'X-Project-Id': project.id
        },
        body: JSON.stringify({
          requests: batchRequests,
          maxConcurrency: 5 // Traitement parallèle contrôlé
        })
      })
      
      if (batchResponse.ok) {
        const batchData = await batchResponse.json()
        
        // Mettre à jour les statuts des critères
        for (const result of batchData.results) {
          if (result.success) {
            await prisma.critere.update({
              where: { id: result.critereId },
              data: { status: "done", note: null }
            })
            facebookProcessedCount++
          } else {
            await prisma.critere.update({
              where: { id: result.critereId },
              data: { status: "retry", note: result.error }
            })
            facebookFailed.push({ label: result.searchTerm, error: result.error })
          }
        }
        
        console.log(`✅ BATCH TERMINÉ: ${batchData.stats.successful}/${batchData.stats.total} succès`)
        console.log(`📊 Cache: ${batchData.stats.fromCache}/${batchData.stats.total} hits (${Math.round(batchData.stats.fromCache/batchData.stats.total*100)}%)`)
        
      } else {
        console.error('❌ Erreur batch Facebook:', await batchResponse.text())
        // Fallback sur traitement individuel
        for (const critere of batch) {
          await prisma.critere.update({
            where: { id: critere.id },
            data: { status: "retry", note: "Erreur batch, à retenter" }
          })
        }
      }
      
    } catch (error) {
      console.error('❌ Exception batch Facebook:', error)
      // Marquer comme retry pour traitement ultérieur
      for (const critere of batch) {
        await prisma.critere.update({
          where: { id: critere.id },
          data: { status: "retry", note: "Exception batch" }
        })
      }
    }
    
    // Pause optimisée entre les batches
    if (facebookProcessedCount > 0 && facebookProcessedCount % facebookBatchSize === 0) {
      console.log(`⏸️ Pause optimisée de ${facebookPauseMs / 1000}s après ${facebookBatchSize} requêtes...`)
      
      // Vérifier le statut AVANT la pause
      const statusBeforePause = await prisma.project.findUnique({ where: { id: project.id } })
      if (!statusBeforePause || ['cancelled', 'paused'].includes(statusBeforePause.enrichmentStatus)) {
        console.log('🛑 Enrichissement arrêté pendant la pause Facebook')
        return
      }
      
      await prisma.project.update({
        where: { id: project.id },
        data: { 
          enrichmentStatus: 'processing',
          updatedAt: new Date()
        }
      })
      
      await new Promise(resolve => setTimeout(resolve, facebookPauseMs))
      
      // Vérifier le statut APRÈS la pause
      const statusAfterPause = await prisma.project.findUnique({ where: { id: project.id } })
      if (!statusAfterPause || ['cancelled', 'paused'].includes(statusAfterPause.enrichmentStatus)) {
        console.log('🛑 Enrichissement arrêté après la pause Facebook')
        return
      }
      
      console.log(`▶️ Reprise après pause optimisée (${facebookProcessedCount}/${totalSteps} traités)`)
    }
    
    // Recharger les critères "retry" pour le prochain batch
    criteresToProcess = await prisma.critere.findMany({
      where: { projectId: project.id, status: "retry" },
      orderBy: { createdAt: 'asc' }
    })
    
    if (criteresToProcess.length > 0) {
      console.log(`🔁 ${criteresToProcess.length} critères à retenter (status=retry)`)
    }
  }

  if (facebookFailed.length > 0) {
    console.warn(`⚠️ ${facebookFailed.length} critères Facebook ont échoué après 3 tentatives :`);
    facebookFailed.forEach(f => console.warn(`- ${f.label} : ${f.error}`));
  }

  console.log(`🎉 SUGGESTIONS FACEBOOK: ${facebookProcessedCount}/${totalSteps} critères traités`)

  // Marquer le projet comme terminé ou en erreur
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

  // Générer un rapport de logs Facebook pour ce projet
  try {
    const reportSummary = facebookLogger.generateSummaryReport()
    console.log('📊 RAPPORT FACEBOOK GÉNÉRÉ:', reportSummary)
  } catch (error) {
    console.error('❌ Erreur lors de la génération du rapport Facebook:', error)
  }

  console.log(`🎉 Enrichissement terminé pour le projet ${project.name}`)
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer le seuil de pertinence depuis les settings
    const relevanceSettings = await prisma.appSetting.findFirst({
      where: { key: 'facebookRelevanceScoreThreshold' }
    })
    const relevanceThreshold = Number(relevanceSettings?.value || 0.3)

    const projects = await prisma.project.findMany({
      where: { ownerId: session.user.id },
      include: {
        categoryList: true,
        _count: { select: { criteres: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Mapping des codes pays vers drapeaux
    const countryFlags: Record<string, string> = {
      'FR': '🇫🇷', 'US': '🇺🇸', 'GB': '🇬🇧', 'DE': '🇩🇪', 'ES': '🇪🇸', 
      'IT': '🇮🇹', 'CA': '🇨🇦', 'AU': '🇦🇺', 'JP': '🇯🇵', 'CN': '🇨🇳',
      'IN': '🇮🇳', 'BR': '🇧🇷', 'MX': '🇲🇽', 'AR': '🇦🇷', 'CL': '🇨🇱',
      'PE': '🇵🇪', 'CO': '🇨🇴', 'VE': '🇻🇪', 'EC': '🇪🇨', 'BO': '🇧🇴',
      'PY': '🇵🇾', 'UY': '🇺🇾', 'GY': '🇬🇾', 'SR': '🇸🇷', 'TR': '🇹🇷',
      'RU': '🇷🇺', 'KR': '🇰🇷', 'TH': '🇹🇭', 'VN': '🇻🇳', 'PH': '🇵🇭',
      'ID': '🇮🇩', 'MY': '🇲🇾', 'SG': '🇸🇬', 'NZ': '🇳🇿', 'ZA': '🇿🇦',
      'EG': '🇪🇬', 'MA': '🇲🇦', 'NG': '🇳🇬', 'KE': '🇰🇪', 'GH': '🇬🇭',
      'ET': '🇪🇹', 'TZ': '🇹🇿', 'UG': '🇺🇬', 'ZW': '🇿🇼', 'ZM': '🇿🇲',
      'MW': '🇲🇼', 'MZ': '🇲🇿', 'AO': '🇦🇴', 'NA': '🇳🇦', 'BW': '🇧🇼',
      'LS': '🇱🇸', 'SZ': '🇸🇿', 'MG': '🇲🇬', 'MU': '🇲🇺', 'SC': '🇸🇨'
    }

    const mapped = await Promise.all(projects.map(async (p) => {
      // Compter les critères pertinents basés sur le relevanceScore
      const validCriteria = await prisma.critere.count({
        where: {
          projectId: p.id,
          suggestions: {
            some: {
              similarityScore: {
                gte: relevanceThreshold
              }
            }
          }
        }
      })

      return {
        ...p,
        criteriaMatchCount: p._count.criteres,
        validCriteriaCount: validCriteria,
        countryFlag: countryFlags[p.country] || '🏳️'
      }
    }))

    return NextResponse.json({ projects: mapped })
  } catch (error) {
    console.error('Error retrieving projects:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 