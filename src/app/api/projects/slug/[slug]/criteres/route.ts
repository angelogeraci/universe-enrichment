import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { slug } = await params

    // Récupérer le projet par slug et ownerId
    const project = await prisma.project.findFirst({
      where: {
        slug: slug,
        ownerId: session.user.id
      },
      select: { id: true }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Récupérer tous les critères du projet avec suggestions Facebook
    const criteres = await prisma.critere.findMany({
      where: { projectId: project.id },
      include: { suggestions: true }
    })

    return NextResponse.json({ criteres }, { status: 200 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 