import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
    }
    // Verify that the project belongs to the user
    const project = await prisma.project.findUnique({
      where: { id },
      select: { ownerId: true }
    })
    if (!project || project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 404 })
    }
    // First delete all Facebook suggestions linked to project criteria
    const criteres = await prisma.critere.findMany({ where: { projectId: id }, select: { id: true } })
    const critereIds = criteres.map(c => c.id)
    if (critereIds.length > 0) {
      await prisma.suggestionFacebook.deleteMany({ where: { critereId: { in: critereIds } } })
      await prisma.critere.deleteMany({ where: { id: { in: critereIds } } })
    }
    // Delete the project
    await prisma.project.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 })
  }
} 