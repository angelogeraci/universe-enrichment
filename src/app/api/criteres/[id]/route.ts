import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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