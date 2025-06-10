import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  console.log('🔍 PUT /api/prompts/[id] - DÉBUT')
  
  try {
    const { id } = params
    console.log('📝 ID du prompt:', id)
    
    const body = await req.json()
    console.log('📥 DONNÉES REÇUES:', body)
    
    const { label, template, description, isActive } = body
    
    // Validation des données requises
    if (!label || !template) {
      console.log('❌ DONNÉES MANQUANTES')
      return NextResponse.json({ error: 'Label et template requis' }, { status: 400 })
    }
    
    console.log('💾 MISE À JOUR EN BASE...')
    
    // Mise à jour du prompt
    const updatedPrompt = await prisma.promptTemplate.update({
      where: { id },
      data: {
        label,
        template,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true
      }
    })
    
    console.log('✅ PROMPT MIS À JOUR:', updatedPrompt.id)
    
    return NextResponse.json({
      success: true,
      prompt: updatedPrompt
    })
    
  } catch (error) {
    console.error('❌ ERREUR PUT PROMPT:', error)
    
    // Gérer les erreurs Prisma spécifiques
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Prompt non trouvé' }, { status: 404 })
    }
    
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du prompt' }, { status: 500 })
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  console.log('🔍 GET /api/prompts/[id] - DÉBUT')
  
  try {
    const { id } = params
    console.log('📝 ID du prompt:', id)
    
    const prompt = await prisma.promptTemplate.findUnique({
      where: { id }
    })
    
    if (!prompt) {
      console.log('❌ PROMPT NON TROUVÉ')
      return NextResponse.json({ error: 'Prompt non trouvé' }, { status: 404 })
    }
    
    console.log('✅ PROMPT TROUVÉ:', prompt.id)
    
    return NextResponse.json({ prompt })
    
  } catch (error) {
    console.error('❌ ERREUR GET PROMPT:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération du prompt' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  console.log('🔍 DELETE /api/prompts/[id] - DÉBUT')
  
  try {
    const { id } = params
    console.log('📝 ID du prompt:', id)
    
    await prisma.promptTemplate.delete({
      where: { id }
    })
    
    console.log('✅ PROMPT SUPPRIMÉ:', id)
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('❌ ERREUR DELETE PROMPT:', error)
    
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json({ error: 'Prompt non trouvé' }, { status: 404 })
    }
    
    return NextResponse.json({ error: 'Erreur lors de la suppression du prompt' }, { status: 500 })
  }
} 