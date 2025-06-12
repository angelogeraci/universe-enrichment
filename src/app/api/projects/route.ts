import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createSlug } from '@/lib/utils'

export async function POST (req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const body = await req.json()
    const { name, description, country, searchType, categoryListId } = body
    if (!name) {
      return NextResponse.json({ error: 'Le nom du projet est requis' }, { status: 400 })
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

    console.log('🚀 PROJET CRÉÉ:', project.name, 'ID:', project.id)
    console.log('📁 CATÉGORIES TROUVÉES:', project.categoryList.categories.length)

    // Déclencher l'enrichissement automatique en arrière-plan
    triggerEnrichment(project, project.categoryList.categories, req)
      .catch(err => {
        console.error('❌ ERREUR ENRICHISSEMENT GLOBAL:', err)
      })

    return NextResponse.json({ message: 'Projet créé avec succès', project })
  } catch (error) {
    console.error('Erreur lors de la création du projet:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
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

  // ÉTAPE 1: Enrichissement IA (génération des critères)
  console.log('🤖 PHASE 1: ENRICHISSEMENT IA')
  for (const category of categories) {
    try {
      console.log(`🔄 TRAITEMENT CATÉGORIE: ${category.name}`)

      // Mettre à jour le statut avec progression détaillée
      await prisma.project.update({
        where: { id: project.id },
        data: { 
          enrichmentStatus: 'processing',
          // Ajouter un champ de progression si nécessaire
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
  
  for (const critere of allCriteres) {
    try {
      console.log(`🔄 RECHERCHE FACEBOOK: ${critere.label}`)

      // Appel à l'API Facebook suggestions
      const facebookResponse = await fetch(`${baseUrl}/api/facebook/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          critereId: critere.id,
          query: critere.label,
          country: critere.country
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

    } catch (error) {
      console.error(`❌ EXCEPTION FACEBOOK ${critere.label}:`, error)
      // On ne considère pas ça comme une erreur bloquante
    }
  }

  console.log(`🎉 SUGGESTIONS FACEBOOK: ${facebookProcessedCount}/${allCriteres.length} critères traités`)

  // Marquer le projet comme terminé ou en erreur
  const finalStatus = hasError ? 'error' : 'done'
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
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: { ownerId: session.user.id },
      include: {
        categoryList: true,
        _count: { select: { criteres: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const mapped = projects.map(p => ({
      ...p,
      criteriaMatchCount: p._count.criteres
    }))

    return NextResponse.json({ projects: mapped })
  } catch (error) {
    console.error('Erreur lors de la récupération des projets:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
} 