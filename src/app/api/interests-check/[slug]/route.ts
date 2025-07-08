import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { slug } = await context.params

    // Récupérer l'Interest Check avec le count des intérêts
    const interestCheck = await prisma.interestCheck.findUnique({
      where: { 
        slug,
        ownerId: session.user.id 
      },
      include: {
        _count: {
          select: {
            interests: true
          }
        }
      }
    })

    if (!interestCheck) {
      return NextResponse.json({ error: 'Interest Check non trouvé ou accès refusé' }, { status: 404 })
    }

    return NextResponse.json({ interestCheck })

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'Interest Check:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 