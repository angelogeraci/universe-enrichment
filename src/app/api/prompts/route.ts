import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Valeurs par défaut du prompt principal
const DEFAULT_PROMPT = {
  label: 'Génération de critères marketing',
  template: `Génère une liste de critères marketing pour la catégorie {{category}}, le pays {{country}} et les options suivantes : {{options}}. Respecte le format JSON suivant : [{label: string, description: string, type: string}]. Réponds uniquement avec le tableau JSON, sans texte ni balise markdown.`,
  description: 'Prompt principal utilisé pour générer les critères marketing à partir des paramètres métier.',
  isActive: true,
}

// GET /api/prompts : liste tous les prompts (et crée le prompt principal si absent)
export async function GET () {
  let prompts = await prisma.promptTemplate.findMany({ orderBy: { createdAt: 'desc' } })
  if (prompts.length === 0) {
    const prompt = await prisma.promptTemplate.create({ data: DEFAULT_PROMPT })
    prompts = [prompt]
  }
  return NextResponse.json({ prompts })
}

// POST /api/prompts : crée un nouveau prompt
export async function POST (req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  const data = await req.json()
  const { label, template, description, isActive } = data
  if (!label || !template) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }
  const prompt = await prisma.promptTemplate.create({
    data: { label, template, description, isActive: isActive ?? true }
  })
  return NextResponse.json({ prompt })
} 