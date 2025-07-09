import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enrichWithLatitudeSo } from '@/lib/enrichment-latitude'

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

export async function POST (req: NextRequest) {
  console.log('🔍 API ENRICHMENT - DÉBUT (Latitude.so)')
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
    
    // Vérifier les variables d'environnement Latitude.so
    if (!process.env.LATITUDE_API_KEY || !process.env.LATITUDE_PROJECT_ID) {
      console.log('❌ CONFIGURATION LATITUDE.SO MANQUANTE')
      return NextResponse.json({ error: 'Configuration Latitude.so manquante' }, { status: 500 })
    }
    
    console.log('🚀 UTILISATION DE LATITUDE.SO pour searchType:', project.searchType)
    
    // Convertir le code pays en nom complet anglais
    const countryFullName = getCountryFullName(country)
    console.log('🌍 CONVERSION PAYS:', `${country} → ${countryFullName}`)
    
    console.log('🤖 APPEL LATITUDE.SO EN COURS...')
    
    // Utiliser Latitude.so pour l'enrichissement
    const latitudeResult = await enrichWithLatitudeSo({
      category,
      country: countryFullName,
      searchType: project.searchType,
      additionalContext: categoryPath ? `Category path: ${categoryPath}` : undefined
    })
    
    console.log('🤖 LATITUDE.SO RÉPONSE REÇUE')
    const processingTime = Date.now() - startTime
    
    console.log('RÉPONSE LATITUDE.SO:', latitudeResult)

    // Enregistrer le log d'enrichissement
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
          model: latitudeResult.metadata.model,
          promptSent: `Latitude.so prompt: ${latitudeResult.metadata.promptUsed}`,
          responseRaw: JSON.stringify(latitudeResult.criteria),
          responseStatus: 'success',
          processingTime: processingTime
        }
      })
      console.log('📝 LOG ENRICHISSEMENT ENREGISTRÉ')
    } catch (logError) {
      console.error('❌ ERREUR ENREGISTREMENT LOG:', logError)
    }
    
    // Convertir les critères de Latitude.so au format attendu
    const criteria = latitudeResult.criteria.map((criteriaText: string) => ({
      label: criteriaText,
      description: null,
      type: 'auto-generated'
    }))
    
    console.log('✅ CRITÈRES CONVERTIS:', criteria)
    
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
          label: c.label || c.name || c.title || 'Sans titre',
          status: 'pending',
          note: c.description || c.note || null,
          categoryPath: categoryPath ? [categoryPath] : [],
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
    }
    
    console.log('✅ API ENRICHMENT - SUCCÈS (Latitude.so)')
    return NextResponse.json({ 
      criteria: inserted.length ? inserted : criteria,
      metadata: {
        provider: 'latitude.so',
        promptUsed: latitudeResult.metadata.promptUsed,
        model: latitudeResult.metadata.model,
        conversationUuid: latitudeResult.metadata.conversationUuid,
        usage: latitudeResult.metadata.usage
      }
    })
    
  } catch (error) {
    console.error('❌ ERREUR API ENRICHMENT (Latitude.so):', error)
    
    // Enregistrer l'erreur dans les logs
    try {
      await prisma.enrichmentLog.deleteMany({})
      await prisma.enrichmentLog.create({
        data: {
          projectId: 'error',
          projectName: 'Error',
          category: 'error',
          country: 'error',
          searchType: 'origin',
          model: 'latitude.so',
          promptSent: 'Error occurred',
          responseRaw: error instanceof Error ? error.message : 'Unknown error',
          responseStatus: 'error',
          processingTime: Date.now() - startTime
        }
      })
    } catch (logError) {
      console.error('❌ ERREUR ENREGISTREMENT LOG D\'ERREUR:', logError)
    }
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'enrichissement avec Latitude.so',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, 
      { status: 500 }
    )
  }
} 