import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET: listes de l'utilisateur + publiques
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  console.log('SESSION DEBUG', session)
  if (!session?.user?.id) {
    return NextResponse.json([], { status: 401 })
  }
  const lists = await prisma.categoryList.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { isPublic: true },
        { sharedWith: { some: { id: session.user.id } } },
      ],
    },
    include: {
      categories: true,
      owner: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(lists)
}

// POST: création d'une nouvelle liste
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  console.log('SESSION DEBUG', session)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const { name, isPublic } = body
  if (!name) {
    return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })
  }
  function slugify(str: string) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
  }
  let base = slugify(name)
  let slug = base
  let i = 1
  while (await prisma.categoryList.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`
  }
  const list = await prisma.categoryList.create({
    data: {
      name,
      slug,
      isPublic: !!isPublic,
      ownerId: session.user.id,
    },
  })
  return NextResponse.json(list, { status: 201 })
} 