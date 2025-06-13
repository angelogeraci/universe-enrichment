import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { action } = await req.json()
    const { slug } = params

    if (!['pause', 'resume', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    const project = await prisma.project.findUnique({
      where: { slug },
      include: {
        categoryList: {
          include: { categories: true }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }

    let updateData: any = { updatedAt: new Date() }

    switch (action) {
      case 'pause':
        if (project.enrichmentStatus !== 'processing') {
          return NextResponse.json({ error: 'Le projet doit être en cours de traitement pour être mis en pause' }, { status: 400 })
        }
        updateData.enrichmentStatus = 'paused'
        updateData.pausedAt = new Date()
        break

      case 'resume':
        if (project.enrichmentStatus !== 'paused') {
          return NextResponse.json({ error: 'Le projet doit être en pause pour être repris' }, { status: 400 })
        }
        updateData.enrichmentStatus = 'processing'
        updateData.pausedAt = null
        
        // Redémarrer l'enrichissement en arrière-plan
        const baseUrl = `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('host') || 'localhost:3000'}`
        
        // Relancer l'enrichissement de manière asynchrone
        fetch(`${baseUrl}/api/projects/resume`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            projectId: project.id, 
            categories: project.categoryList.categories 
          })
        }).catch(err => console.error('❌ Erreur reprise enrichissement:', err))
        
        break

      case 'cancel':
        if (!['processing', 'paused', 'pending'].includes(project.enrichmentStatus)) {
          return NextResponse.json({ error: 'Le projet ne peut pas être annulé dans son état actuel' }, { status: 400 })
        }
        updateData.enrichmentStatus = 'cancelled'
        updateData.pausedAt = null
        break
    }

    const updatedProject = await prisma.project.update({
      where: { slug },
      data: updateData
    })

    return NextResponse.json({ 
      success: true, 
      status: updatedProject.enrichmentStatus,
      message: `Projet ${action === 'pause' ? 'mis en pause' : action === 'resume' ? 'repris' : 'annulé'} avec succès` 
    })

  } catch (error: any) {
    console.error('❌ Erreur contrôle projet:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
} 