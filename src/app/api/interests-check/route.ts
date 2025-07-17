import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

// GET - Lister les Interest Checks de l'utilisateur
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    console.log('SESSION DEBUG:', session)
    
    if (!session?.user?.email) {
      console.log('❌ AUTHENTIFICATION ÉCHOUÉE: Pas de session ou email')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Utiliser session.user.id directement s'il est disponible
    let userId = session.user.id
    
    if (!userId) {
      console.log('🔍 Recherche utilisateur par email:', session.user.email)
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })

      if (!user) {
        console.log('❌ UTILISATEUR NON TROUVÉ:', session.user.email)
        return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 401 })
      }
      
      userId = user.id
    }

    console.log('✅ UTILISATEUR AUTHENTIFIÉ:', { userId, email: session.user.email })

    // Vérifier que l'utilisateur existe vraiment
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!userExists) {
      console.log('❌ UTILISATEUR ID INVALIDE:', userId)
      return NextResponse.json({ error: 'Utilisateur invalide' }, { status: 401 })
    }

    const interestChecks = await prisma.interestCheck.findMany({
      where: { ownerId: userId },
      include: {
        _count: {
          select: { interests: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log('📊 INTEREST CHECKS TROUVÉS:', interestChecks.length)

    return NextResponse.json({ interestChecks })
  } catch (error) {
    console.error('❌ ERREUR API INTERESTS-CHECK:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

// POST - Créer un nouveau Interest Check
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Utiliser session.user.id directement s'il est disponible
    let userId = session.user.id
    
    if (!userId) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })

      if (!user) {
        return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 401 })
      }
      
      userId = user.id
    }

    // Vérifier que l'utilisateur existe vraiment
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!userExists) {
      return NextResponse.json({ error: 'Utilisateur invalide' }, { status: 401 })
    }

    // Parser le FormData
    const formData = await request.formData()
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const country = formData.get('country') as string
    const file = formData.get('file') as File

    if (!name || !file) {
      return NextResponse.json({ error: 'Nom et fichier requis' }, { status: 400 })
    }

    // Générer un slug unique
    const baseSlug = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    let slug = baseSlug
    let counter = 1
    while (await prisma.interestCheck.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Lire et parser le fichier Excel
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

    if (data.length < 2) {
      return NextResponse.json({ error: 'Le fichier Excel doit contenir au moins une ligne de données' }, { status: 400 })
    }

    // Extraire les noms (première colonne, en ignorant l'en-tête)
    const interests = data.slice(1)
      .map(row => row[0])
      .filter(name => name && typeof name === 'string' && name.trim())
      .map(name => name.trim())

    if (interests.length === 0) {
      return NextResponse.json({ error: 'Aucun intérêt valide trouvé dans le fichier' }, { status: 400 })
    }

    // Créer l'Interest Check en transaction
    const interestCheck = await prisma.$transaction(async (tx) => {
      // Créer l'Interest Check
      const newInterestCheck = await tx.interestCheck.create({
        data: {
          name,
          slug,
          description: description || null,
          country,
          fileName: file.name,
          ownerId: userId
        }
      })

      // Créer tous les intérêts
      const interestData = interests.map(interestName => ({
        interestCheckId: newInterestCheck.id,
        name: interestName,
        country,
        status: 'pending'
      }))

      await tx.interest.createMany({
        data: interestData
      })

      return newInterestCheck
    })

    console.log(`✅ Interest Check créé: ${interestCheck.name} avec ${interests.length} intérêts`)

    return NextResponse.json({
      id: interestCheck.id,
      slug: interestCheck.slug,
      name: interestCheck.name,
      interestsCount: interests.length
    })

  } catch (error) {
    console.error('Erreur lors de la création de l\'Interest Check:', error)
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }
} 