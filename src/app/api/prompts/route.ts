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

// GET /api/prompts : liste tous les prompts
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 GET /api/prompts - DÉBUT')
    
    const prompts = await prisma.promptTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        label: true,
        template: true,
        description: true,
        searchType: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    console.log('📋 Prompts trouvés:', prompts.length)
    console.log('📝 Détails prompts:', prompts.map(p => ({ id: p.id, label: p.label, searchType: p.searchType })))
    
    return NextResponse.json({ prompts })
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des prompts:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: 'Erreur serveur', details: errorMessage }, { status: 500 })
  }
}

// POST /api/prompts : crée un nouveau prompt
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }
    
    const body = await req.json()
    const { label, template, description, searchType, isActive } = body
    
    if (!label || !template) {
      return NextResponse.json({ error: 'Label et template requis' }, { status: 400 })
    }
    
    const prompt = await prisma.promptTemplate.create({
      data: {
        label,
        template,
        description: description || null,
        searchType: searchType || null,
        isActive: isActive !== undefined ? isActive : true
      }
    })
    
    return NextResponse.json({ success: true, prompt })
  } catch (error) {
    console.error('Erreur lors de la création du prompt:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
} 