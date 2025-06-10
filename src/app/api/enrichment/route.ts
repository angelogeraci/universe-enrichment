import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import prisma from '@/lib/prisma'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Instructions de format de sortie - ajoutées automatiquement au prompt
const OUTPUT_FORMAT_INSTRUCTION = `

IMPORTANT - FORMAT DE RÉPONSE REQUIS:
Vous devez répondre uniquement avec un tableau JSON de chaînes de caractères, sans texte explicatif, sans balises markdown, sans formatage supplémentaire.

Format attendu : ["item1", "item2", "item3"]

Règles strictes :
- Réponse UNIQUEMENT en format JSON array
- Chaque élément est une chaîne de caractères
- Pas de texte avant ou après le JSON
- Pas de balises \`\`\`json ou autres
- Maximum 50 éléments par réponse`

export async function POST (req: NextRequest) {
  console.log('🔍 API ENRICHMENT - DÉBUT')
  
  try {
    const body = await req.json()
    console.log('📥 BODY REÇU:', body)
    
    const { project, category, country, options } = body
    console.log('📋 PARAMÈTRES EXTRAITS:', { project, category, country, options })
    
    if (!category || !country) {
      console.log('❌ PARAMÈTRES MANQUANTS - category:', category, 'country:', country)
      return NextResponse.json({ error: 'Catégorie et pays requis' }, { status: 400 })
    }
    
    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ CLÉ OPENAI MANQUANTE')
      return NextResponse.json({ error: 'Clé OpenAI manquante' }, { status: 500 })
    }
    
    console.log('🔍 RECHERCHE PROMPT TEMPLATE...')
    
    // Récupère le prompt principal
    const promptTemplate = await prisma.promptTemplate.findFirst({ where: { isActive: true } })
    console.log('📝 PROMPT TEMPLATE TROUVÉ:', promptTemplate ? 'OUI' : 'NON')
    
    if (!promptTemplate) {
      console.log('❌ PROMPT TEMPLATE INTROUVABLE')
      return NextResponse.json({ error: 'Prompt principal introuvable' }, { status: 500 })
    }
    
    console.log('📝 TEMPLATE BRUT:', promptTemplate.template)
    
    // Génère le prompt dynamique avec le template de l'admin
    const userPrompt = promptTemplate.template
      .replace('{{category}}', category)
      .replace('{{country}}', country)
      .replace('{{options}}', options || '')
    
    // Combine le prompt de l'admin avec les instructions de format automatiques
    const fullPrompt = userPrompt + OUTPUT_FORMAT_INSTRUCTION
    
    console.log('📝 PROMPT UTILISATEUR:', userPrompt)
    console.log('📝 PROMPT COMPLET ENVOYÉ À OPENAI:', fullPrompt)
    
    console.log('🤖 APPEL OPENAI EN COURS...')
    
    // Appel OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Tu es un assistant marketing expert. Tu suis scrupuleusement les instructions de format.' },
        { role: 'user', content: fullPrompt }
      ]
    })
    
    console.log('🤖 OPENAI RÉPONSE REÇUE')
    
    // Extraction du JSON dans la réponse
    const content = completion.choices[0]?.message?.content || ''
    console.log('RÉPONSE BRUTE OPENAI:', content)
    
    let criteria = []
    function extractJsonArray(str: string): any {
      // Cherche un bloc markdown ```json ... ```
      const md = str.match(/```json([\s\S]*?)```/i)
      if (md) {
        try {
          return JSON.parse(md[1])
        } catch {}
      }
      // Cherche le premier tableau JSON dans la chaîne
      const arr = str.match(/\[([\s\S]*?)\]/)
      if (arr) {
        try {
          return JSON.parse('[' + arr[1] + ']')
        } catch {}
      }
      // Dernière tentative : JSON.parse direct
      try {
        return JSON.parse(str)
      } catch {}
      return null
    }
    criteria = extractJsonArray(content)
    console.log('CRITÈRES EXTRAITS:', criteria)
    
    if (!criteria) {
      console.log('❌ CRITÈRES NON CONFORMES')
      return NextResponse.json({ error: 'Réponse OpenAI non conforme', raw: content }, { status: 500 })
    }
    
    // Transformer les strings en objets si nécessaire
    if (criteria.length > 0 && typeof criteria[0] === 'string') {
      console.log('🔄 CONVERSION STRING VERS OBJETS')
      criteria = criteria.map((item: string) => ({
        label: item,
        description: null,
        type: 'auto-generated'
      }))
      console.log('✅ CRITÈRES CONVERTIS:', criteria)
    }
    
    let inserted: any[] = []
    // Insérer les critères en base si project.id fourni
    if (project?.id) {
      console.log('💾 INSERTION EN BASE - Project ID:', project.id)
      
      // On ajoute les champs nécessaires pour chaque critère
      const toInsert = criteria.map((c: any) => {
        console.log('CRITÈRE INDIVIDUEL:', c)
        return {
          projectId: project.id,
          category: category,
          country: country,
          label: c.label || c.name || c.title || 'Sans titre', // Support de différents formats
          status: 'pending',
          note: c.description || c.note || null,
          categoryPath: [], // à adapter si besoin
        }
      })
      
      console.log('DONNÉES À INSÉRER:', toInsert)
      
      if (toInsert.length > 0) {
        console.log('💾 INSERTION PRISMA...')
        await prisma.critere.createMany({ data: toInsert })
        console.log('✅ INSERTION RÉUSSIE')
        
        inserted = await prisma.critere.findMany({
          where: { projectId: project.id },
          orderBy: { createdAt: 'desc' }
        })
        console.log('📋 CRITÈRES RÉCUPÉRÉS:', inserted.length)
      }
      
      // Ne plus marquer automatiquement le projet comme "done" ici
      // Car c'est maintenant géré par l'API de création de projet après toutes les catégories
    }
    console.log('✅ API ENRICHMENT - SUCCÈS')
    return NextResponse.json({ criteria: inserted.length ? inserted : criteria })
  } catch (e) {
    console.error('❌ ERREUR ENRICHISSEMENT DÉTAILLÉE:', e)
    console.error('❌ STACK TRACE:', e instanceof Error ? e.stack : 'No stack trace')
    return NextResponse.json({ error: 'Erreur lors de la génération des critères' }, { status: 500 })
  }
} 