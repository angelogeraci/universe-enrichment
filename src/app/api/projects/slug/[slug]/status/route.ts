import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { slug } = await params

    const project = await prisma.project.findFirst({
      where: {
        slug: slug,
        ownerId: session.user.id
      },
      select: {
        id: true,
        enrichmentStatus: true
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ 
      enrichmentStatus: project.enrichmentStatus 
    })

  } catch (error) {
    console.error('Erreur lors de la récupération du statut:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
} 