import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: liste des catégories d'une liste
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const list = await prisma.categoryList.findUnique({
    where: { slug },
    include: { categories: true }
  })
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ name: list.name, id: list.id, categories: list.categories })
}

// POST: ajout d'une catégorie à la liste
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const list = await prisma.categoryList.findUnique({ where: { slug } })
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (list.ownerId !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const { name, paths, andCriteria } = body
  if (!name || !paths?.length) {
    return NextResponse.json({ error: 'Nom et au moins un path requis' }, { status: 400 })
  }
  const created = await Promise.all(paths.map((path: string) =>
    prisma.category.create({
      data: {
        name,
        path,
        andCriteria: andCriteria || [],
        categoryListId: list.id,
      }
    })
  ))
  return NextResponse.json({ success: true, categories: created })
}

// DELETE: suppression de catégories ou de la liste complète
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const list = await prisma.categoryList.findUnique({ where: { slug } })
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  
  if (list.ownerId !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  const body = await req.json()
  
  // Si on a un id ou des ids, on supprime les catégories spécifiques
  if (body.id || body.ids) {
    try {
      const idsToDelete = body.ids ? body.ids : [body.id]
      
      // Vérifier que toutes les catégories appartiennent à cette liste
      const categoriesToDelete = await prisma.category.findMany({
        where: {
          id: { in: idsToDelete },
          categoryListId: list.id
        }
      })
      
      if (categoriesToDelete.length !== idsToDelete.length) {
        return NextResponse.json({ error: 'Certaines catégories n\'appartiennent pas à cette liste' }, { status: 400 })
      }
      
      // Supprimer les catégories
      await prisma.category.deleteMany({
        where: {
          id: { in: idsToDelete },
          categoryListId: list.id
        }
      })
      
      return NextResponse.json({ 
        message: `${idsToDelete.length} catégorie(s) supprimée(s) avec succès` 
      }, { status: 200 })
    } catch (error) {
      console.error('Erreur lors de la suppression des catégories:', error)
      return NextResponse.json({ error: 'Erreur lors de la suppression des catégories' }, { status: 500 })
    }
  }
  
  // Sinon, suppression de la liste complète (comportement existant)
  try {
    // Vérifier si la liste est utilisée par des projets
    const projectsUsingList = await prisma.project.findMany({
      where: { categoryListId: list.id }
    })
    
    if (projectsUsingList.length > 0) {
      return NextResponse.json({ 
        error: `Impossible de supprimer cette liste. Elle est utilisée par ${projectsUsingList.length} projet(s).` 
      }, { status: 400 })
    }
    
    // Supprimer d'abord toutes les catégories de la liste
    await prisma.category.deleteMany({
      where: { categoryListId: list.id }
    })
    
    // Puis supprimer la liste elle-même
    await prisma.categoryList.delete({ where: { slug } })
    
    return NextResponse.json({ message: 'Liste de catégories supprimée avec succès' }, { status: 200 })
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    return NextResponse.json({ 
      error: 'Erreur lors de la suppression. Cette liste pourrait être utilisée par d\'autres éléments.' 
    }, { status: 500 })
  }
} 