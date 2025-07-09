/**
 * Script pour récupérer les IDs Facebook manquants pour les suggestions Interest Check
 * 
 * Ce script :
 * 1. Trouve toutes les suggestions sans facebookId
 * 2. Fait des requêtes à l'API Facebook pour récupérer les IDs
 * 3. Met à jour la base de données avec les IDs trouvés
 */

import { prisma } from '../src/lib/prisma'

// Configuration de l'API Facebook
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN
const FACEBOOK_API_URL = 'https://graph.facebook.com/v21.0/search'

interface FacebookApiResponse {
  data: Array<{
    id: string
    name: string
    audience_size_lower_bound?: number
    audience_size_upper_bound?: number
  }>
}

async function searchFacebookId(suggestionLabel: string, country: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      type: 'adinterest',
      q: suggestionLabel,
      locale: country === 'FR' ? 'fr_FR' : 'en_US',
      access_token: FACEBOOK_ACCESS_TOKEN!
    })

    const response = await fetch(`${FACEBOOK_API_URL}?${params}`)
    
    if (!response.ok) {
      console.log(`❌ Erreur API Facebook pour "${suggestionLabel}": ${response.status}`)
      return null
    }

    const data: FacebookApiResponse = await response.json()
    
    // Chercher une correspondance exacte du nom
    const exactMatch = data.data.find(item => 
      item.name.toLowerCase() === suggestionLabel.toLowerCase()
    )
    
    if (exactMatch) {
      console.log(`✅ ID trouvé pour "${suggestionLabel}": ${exactMatch.id}`)
      return exactMatch.id
    }
    
    // Si pas de correspondance exacte, prendre le premier résultat s'il y en a
    if (data.data.length > 0) {
      const firstMatch = data.data[0]
      console.log(`⚠️  Correspondance approximative pour "${suggestionLabel}": ${firstMatch.id} (${firstMatch.name})`)
      return firstMatch.id
    }
    
    console.log(`❌ Aucun ID trouvé pour "${suggestionLabel}"`)
    return null
    
  } catch (error) {
    console.error(`❌ Erreur lors de la recherche pour "${suggestionLabel}":`, error)
    return null
  }
}

async function fetchMissingFacebookIds() {
  if (!FACEBOOK_ACCESS_TOKEN) {
    console.error('❌ FACEBOOK_ACCESS_TOKEN non défini dans les variables d\'environnement')
    process.exit(1)
  }

  console.log('🔍 DÉMARRAGE: Récupération des IDs Facebook manquants')
  
  try {
    // 1. Récupérer toutes les suggestions Interest Check sans facebookId
    console.log('\n📊 Recherche des suggestions sans ID Facebook...')
    
    const suggestionsWithoutId = await prisma.interestSuggestion.findMany({
      where: {
        facebookId: null
      },
      include: {
        interest: {
          include: {
            interestCheck: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    console.log(`📈 Trouvé ${suggestionsWithoutId.length} suggestions sans ID Facebook`)
    
    if (suggestionsWithoutId.length === 0) {
      console.log('✅ Toutes les suggestions ont déjà un ID Facebook !')
      return
    }

    // 2. Traiter chaque suggestion
    let processedCount = 0
    let foundCount = 0
    let errorCount = 0

    for (const suggestion of suggestionsWithoutId) {
      processedCount++
      const country = suggestion.interest.country || 'US'
      
      console.log(`\n[${processedCount}/${suggestionsWithoutId.length}] Traitement: "${suggestion.label}" (${country})`)
      
      // Rechercher l'ID Facebook
      const facebookId = await searchFacebookId(suggestion.label, country)
      
      if (facebookId) {
        try {
          // Mettre à jour la suggestion avec l'ID Facebook
          await prisma.interestSuggestion.update({
            where: { id: suggestion.id },
            data: { facebookId }
          })
          
          foundCount++
          console.log(`✅ Mise à jour réussie: ${suggestion.label} -> ${facebookId}`)
          
        } catch (updateError) {
          console.error(`❌ Erreur mise à jour pour "${suggestion.label}":`, updateError)
          errorCount++
        }
      } else {
        errorCount++
      }
      
      // Attendre un peu entre les requêtes pour éviter les rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // 3. Résumé final
    console.log('\n' + '='.repeat(50))
    console.log('📊 RÉSUMÉ FINAL:')
    console.log(`📈 Suggestions traitées: ${processedCount}`)
    console.log(`✅ IDs Facebook trouvés: ${foundCount}`)
    console.log(`❌ Échecs: ${errorCount}`)
    console.log(`📊 Taux de succès: ${((foundCount / processedCount) * 100).toFixed(1)}%`)
    
    // 4. Vérification finale
    const remainingSuggestions = await prisma.interestSuggestion.count({
      where: { facebookId: null }
    })
    
    console.log(`\n🔍 Suggestions restantes sans ID: ${remainingSuggestions}`)
    
    if (remainingSuggestions === 0) {
      console.log('🎉 SUCCÈS: Toutes les suggestions ont maintenant un ID Facebook !')
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution du script:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le script
fetchMissingFacebookIds()
  .then(() => {
    console.log('\n✅ Script terminé avec succès')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  }) 