import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import prisma from '@/lib/prisma'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Fonction pour convertir les codes pays en noms complets anglais
function getCountryFullName(countryCode: string): string {
  const countryNames: { [key: string]: string } = {
    'FR': 'France',
    'IT': 'Italy',
    'ES': 'Spain',
    'DE': 'Germany',
    'UK': 'United Kingdom',
    'GB': 'United Kingdom',
    'US': 'United States',
    'CA': 'Canada',
    'BE': 'Belgium',
    'NL': 'Netherlands',
    'CH': 'Switzerland',
    'AT': 'Austria',
    'PT': 'Portugal',
    'PL': 'Poland',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'IE': 'Ireland',
    'LU': 'Luxembourg',
    'CZ': 'Czech Republic',
    'HU': 'Hungary',
    'GR': 'Greece',
    'RO': 'Romania',
    'BG': 'Bulgaria',
    'HR': 'Croatia',
    'SI': 'Slovenia',
    'SK': 'Slovakia',
    'LT': 'Lithuania',
    'LV': 'Latvia',
    'EE': 'Estonia',
    'MT': 'Malta',
    'CY': 'Cyprus'
  }
  
  return countryNames[countryCode] || countryCode
}

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
- Maximum 200 éléments par réponse`

export async function POST (req: NextRequest) {
  console.log('🔍 API ENRICHMENT - DÉBUT')
  const startTime = Date.now()
  
  try {
    const body = await req.json()
    console.log('📥 BODY REÇU:', body)
    
    const { project, category, categoryPath, country } = body
    console.log('📋 PARAMÈTRES EXTRAITS:', { project, category, categoryPath, country })
    
    if (!category || !country) {
      console.log('❌ PARAMÈTRES MANQUANTS - category:', category, 'country:', country)
      return NextResponse.json({ error: 'Catégorie et pays requis' }, { status: 400 })
    }

    if (!project?.searchType) {
      console.log('❌ SEARCH_TYPE MANQUANT dans project:', project)
      return NextResponse.json({ error: 'Type de recherche manquant dans le projet' }, { status: 400 })
    }
    
    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ CLÉ OPENAI MANQUANTE')
      return NextResponse.json({ error: 'Clé OpenAI manquante' }, { status: 500 })
    }
    
    console.log('🔍 RECHERCHE PROMPT TEMPLATE pour searchType:', project.searchType)
    
    // Récupère le prompt selon le searchType du projet
    const promptTemplate = await prisma.promptTemplate.findFirst({ 
      where: { 
        isActive: true,
        searchType: project.searchType
      } 
    })
    console.log('📝 PROMPT TEMPLATE TROUVÉ:', promptTemplate ? `${promptTemplate.label} (${promptTemplate.searchType}) - Modèle: ${promptTemplate.model}` : 'NON')
    
    if (!promptTemplate) {
      console.log('❌ PROMPT TEMPLATE INTROUVABLE pour searchType:', project.searchType)
      return NextResponse.json({ error: `Prompt introuvable pour le type de recherche: ${project.searchType}` }, { status: 500 })
    }
    
    console.log('📝 TEMPLATE BRUT:', promptTemplate.template)
    
    // Convertir le code pays en nom complet anglais
    const countryFullName = getCountryFullName(country)
    console.log('🌍 CONVERSION PAYS:', `${country} → ${countryFullName}`)
    
    // Génère le prompt dynamique avec le template spécialisé
    const userPrompt = promptTemplate.template
      .replace(/\{\{category\}\}/g, category)
      .replace(/\{\{categoryPath\}\}/g, categoryPath || '')
      .replace(/\{\{country\}\}/g, countryFullName)
    
    // Combine le prompt spécialisé avec les instructions de format automatiques
    const fullPrompt = userPrompt + OUTPUT_FORMAT_INSTRUCTION
    
    console.log('📝 PROMPT UTILISATEUR:', userPrompt)
    console.log('📝 PROMPT COMPLET ENVOYÉ À OPENAI:', fullPrompt)
    
    // Récupère le modèle à utiliser depuis le prompt template
    const modelToUse = promptTemplate.model || 'gpt-4o'
    console.log('🤖 MODÈLE OPENAI SÉLECTIONNÉ:', modelToUse)
    
    console.log('🤖 APPEL OPENAI EN COURS...')
    
    // Appel OpenAI avec le modèle spécifié
    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: 'system', content: 'Tu es un assistant marketing expert. Tu suis scrupuleusement les instructions de format.' },
        { role: 'user', content: fullPrompt }
      ]
    })
    
    console.log('🤖 OPENAI RÉPONSE REÇUE')
    const processingTime = Date.now() - startTime
    
    // Extraction du JSON dans la réponse
    const content = completion.choices[0]?.message?.content || ''
    console.log('RÉPONSE BRUTE OPENAI:', content)

    // Supprimer le log précédent et créer un nouveau log
    try {
      // Supprimer tous les logs existants
      await prisma.enrichmentLog.deleteMany({})
      
      // Créer le nouveau log
      await prisma.enrichmentLog.create({
        data: {
          projectId: project.id || 'unknown',
          projectName: project.name || 'Test Project',
          category: category,
          country: country,
          searchType: project.searchType,
          model: modelToUse,
          promptSent: fullPrompt,
          responseRaw: content,
          responseStatus: 'processing', // On mettra à jour après le parsing
          processingTime: processingTime
        }
      })
      console.log('📝 LOG ENRICHISSEMENT ENREGISTRÉ')
    } catch (logError) {
      console.error('❌ ERREUR ENREGISTREMENT LOG:', logError)
    }
    
    let criteria = []
    function extractJsonArray(str: string): any {
      // Nettoyer la chaîne des caractères indésirables
      let cleanStr = str.trim()
      
      // Supprimer les caractères trailing problématiques comme ")." à la fin
      cleanStr = cleanStr.replace(/\)\s*\.\s*$/, '')
      cleanStr = cleanStr.replace(/\.\s*$/, '')
      cleanStr = cleanStr.replace(/\)\s*$/, '')
      
      // Cherche un bloc markdown ```json ... ```
      const md = cleanStr.match(/```json([\s\S]*?)```/i)
      if (md) {
        try {
          const jsonContent = md[1].trim()
          return JSON.parse(jsonContent)
        } catch (e) {
          console.log('❌ Erreur parsing JSON markdown:', e)
        }
      }
      
      // Cherche le premier tableau JSON dans la chaîne
      const arr = cleanStr.match(/(\[[\s\S]*?\])/);
      if (arr) {
        try {
          return JSON.parse(arr[1])
        } catch (e) {
          console.log('❌ Erreur parsing JSON array match:', e)
        }
      }
      
      // Dernière tentative : JSON.parse direct après nettoyage
      try {
        return JSON.parse(cleanStr)
      } catch (e) {
        console.log('❌ Erreur parsing JSON direct:', e)
      }
      
      return null
    }
    criteria = extractJsonArray(content)
    console.log('CRITÈRES EXTRAITS:', criteria)
    
    // Mettre à jour le statut du log
    const finalStatus = criteria ? 'success' : 'error'
    try {
      await prisma.enrichmentLog.updateMany({
        data: { responseStatus: finalStatus }
      })
    } catch (logError) {
      console.error('❌ ERREUR MISE À JOUR STATUT LOG:', logError)
    }
    
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
          categoryPath: categoryPath ? [categoryPath] : [], // Stocker le path de la catégorie
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
    
    // Enregistrer l'erreur dans les logs
    const processingTime = Date.now() - startTime
    try {
      // Supprimer le log précédent et créer un log d'erreur
      await prisma.enrichmentLog.deleteMany({})
      await prisma.enrichmentLog.create({
        data: {
          projectId: 'error',
          projectName: 'Error Project',
          category: 'error',
          country: 'error',
          searchType: 'error',
          model: 'error',
          promptSent: 'Erreur avant l\'envoi du prompt',
          responseRaw: e instanceof Error ? e.message : 'Erreur inconnue',
          responseStatus: 'error',
          processingTime: processingTime
        }
      })
    } catch (logError) {
      console.error('❌ ERREUR ENREGISTREMENT LOG ERREUR:', logError)
    }
    
    return NextResponse.json({ error: 'Erreur lors de la génération des critères' }, { status: 500 })
  }
} 