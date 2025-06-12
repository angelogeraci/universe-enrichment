import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }
    // Vérifier que le projet appartient à l'utilisateur
    const project = await prisma.project.findUnique({
      where: { id },
      select: { ownerId: true }
    })
    if (!project || project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Projet introuvable ou non autorisé' }, { status: 404 })
    }
    await prisma.project.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur', details: String(error) }, { status: 500 })
  }
} 