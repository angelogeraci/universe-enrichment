import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createSlug } from '@/lib/utils'

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
  console.log('📋 PHASE 2: RÉCUPÉRATION DES CRITÈRES GÉNÉRÉS')
  const allCriteres = await prisma.critere.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'asc' }
  })

  console.log(`📊 TOTAL CRITÈRES GÉNÉRÉS: ${allCriteres.length}`)
  totalSteps = allCriteres.length

  // ÉTAPE 3: Appels automatiques aux suggestions Facebook
  console.log('🔍 PHASE 3: ENRICHISSEMENT SUGGESTIONS FACEBOOK')
  let facebookProcessedCount = 0
  
  // Charger dynamiquement les settings
  const { facebookBatchSize, facebookPauseMs, facebookRelevanceScoreThreshold } = await getAppSettings()

  for (const critere of allCriteres) {
    // Vérifier le statut avant chaque critère Facebook
    const projectStatus = await prisma.project.findUnique({ where: { id: project.id } })
    if (!projectStatus || ['cancelled', 'paused'].includes(projectStatus.enrichmentStatus)) {
      console.log('🛑 Enrichissement Facebook interrompu:', critere.label)
      return
    }

    try {
      console.log(`🔄 RECHERCHE FACEBOOK: ${critere.label}`)

      // Appel à l'API Facebook suggestions
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
        // On ne considère pas ça comme une erreur bloquante
      }

      // Pause courte pour éviter de surcharger l'API Facebook
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
      // On ne considère pas ça comme une erreur bloquante
    }
  }

  console.log(`🎉 SUGGESTIONS FACEBOOK: ${facebookProcessedCount}/${allCriteres.length} critères traités`)

  // Marquer le projet comme terminé ou en erreur
  const totalCategories = categories.length
  const failedCount = totalCategories - processedCount
  let finalStatus = 'done'
  if (processedCount === 0) {
    finalStatus = 'error'
  }
  // Log des catégories échouées (optionnel : tu peux les stocker ailleurs si besoin)
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