import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { critereIds, action } = body

    if (!critereIds || !Array.isArray(critereIds) || critereIds.length === 0) {
      return NextResponse.json({ error: 'IDs des critères requis' }, { status: 400 })
    }

    if (!action || !['hide', 'show'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide (hide ou show)' }, { status: 400 })
    }

    // Vérifier que tous les critères existent et appartiennent à l'utilisateur
    const criteresCount = await prisma.critere.count({
      where: {
        id: { in: critereIds },
        project: {
          ownerId: session.user.id
        }
      }
    })

    if (criteresCount !== critereIds.length) {
      return NextResponse.json({ error: 'Certains critères non trouvés' }, { status: 404 })
    }

    // Mettre à jour les critères en lot
    const isHidden = action === 'hide'
    const result = await prisma.critere.updateMany({
      where: {
        id: { in: critereIds },
        project: {
          ownerId: session.user.id
        }
      },
      data: { isHidden }
    })

    return NextResponse.json({ 
      success: true, 
      updated: result.count,
      message: `${result.count} critère(s) ${isHidden ? 'masqué(s)' : 'affiché(s)'}`
    })

  } catch (error) {
    console.error('Erreur lors de la mise à jour en lot:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 