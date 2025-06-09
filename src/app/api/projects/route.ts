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
    triggerEnrichment(project, project.categoryList.categories)
      .catch(err => {
        console.error('❌ ERREUR ENRICHISSEMENT GLOBAL:', err)
      })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('❌ ERREUR CRÉATION PROJET:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function triggerEnrichment(project: any, categories: any[]) {
  console.log('🎯 DÉMARRAGE ENRICHISSEMENT pour', project.name)
  console.log('📋 CATÉGORIES À TRAITER:', categories.map(c => c.name))

  let hasError = false
  let processedCount = 0

  for (const category of categories) {
    try {
      console.log(`🔄 TRAITEMENT CATÉGORIE: ${category.name}`)

      // Appel à l'API d'enrichissement
      const enrichmentResponse = await fetch(`http://localhost:3001/api/enrichment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: { id: project.id },
          category: category.name,
          country: project.country,
          options: project.searchType
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

  // Marquer le projet comme terminé ou en erreur
  const finalStatus = hasError ? 'error' : 'done'
  console.log(`🏁 ENRICHISSEMENT TERMINÉ - Status: ${finalStatus}`)

  await prisma.project.update({
    where: { id: project.id },
    data: { enrichmentStatus: finalStatus }
  })

  console.log(`🎉 Enrichissement terminé pour le projet ${project.name}`)
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const projects = await prisma.project.findMany({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ projects }, { status: 200 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
} 