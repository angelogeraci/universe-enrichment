import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { label, category, categoryPath, note } = body

    // Validation des données
    if (!label || !category || !categoryPath || !Array.isArray(categoryPath)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Récupérer l'utilisateur connecté
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Vérifier si le critère existe et appartient à l'utilisateur
    const critere = await prisma.critere.findUnique({
      where: { id },
      include: { project: true }
    })

    if (!critere) {
      return NextResponse.json({ error: 'Criterion not found' }, { status: 404 })
    }

    if (critere.project.ownerId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Mettre à jour le critère
    const updatedCritere = await prisma.critere.update({
      where: { id },
      data: {
        label,
        category,
        categoryPath,
        note: note || null,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ critere: updatedCritere })
  } catch (error) {
    console.error('Error updating criterion:', error)
    return NextResponse.json(
      { error: 'Error updating criterion' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      console.log('❌ No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    console.log('🔍 Tentative suppression critère:', id, 'par utilisateur:', session.user.email)

    // Récupérer l'utilisateur connecté pour avoir son ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      console.log('❌ Utilisateur non trouvé:', session.user.email)
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    console.log('👤 ID utilisateur:', user.id)

    // Vérifier si le critère existe
    const critere = await prisma.critere.findUnique({
      where: { id },
      include: { project: true }
    })

    console.log('📋 Critère trouvé:', critere ? 'OUI' : 'NON')
    if (critere) {
      console.log('📋 Critère appartient au projet:', critere.project.name)
      console.log('📋 Propriétaire du projet (ID):', critere.project.ownerId)
      console.log('📋 Utilisateur connecté (ID):', user.id)
    }

    if (!critere) {
      console.log('❌ Critère non trouvé avec ID:', id)
      return NextResponse.json({ error: 'Critère non trouvé' }, { status: 404 })
    }

    // Vérifier que l'utilisateur est propriétaire du projet (comparaison par ID)
    if (critere.project.ownerId !== user.id) {
      console.log('❌ Utilisateur non autorisé à supprimer ce critère')
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    console.log('✅ Autorisation OK, suppression en cours...')

    // Supprimer d'abord les suggestions Facebook associées
    await prisma.suggestionFacebook.deleteMany({
      where: { critereId: id }
    })

    // Puis supprimer le critère
    await prisma.critere.delete({
      where: { id }
    })

    console.log('✅ Critère supprimé avec succès:', id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du critère:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du critère' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { isHidden } = body

    // Vérifier que le critère existe et appartient à l'utilisateur
    const critere = await prisma.critere.findFirst({
      where: {
        id,
        project: {
          ownerId: session.user.id
        }
      }
    })

    if (!critere) {
      return NextResponse.json({ error: 'Critère non trouvé' }, { status: 404 })
    }

    // Mettre à jour l'état isHidden
    const updatedCritere = await prisma.critere.update({
      where: { id },
      data: { isHidden }
    })

    return NextResponse.json({
      success: true,
      critere: updatedCritere,
      message: isHidden ? 'Critère masqué' : 'Critère affiché'
    })

  } catch (error) {
    console.error('Erreur lors de la mise à jour du critère:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 