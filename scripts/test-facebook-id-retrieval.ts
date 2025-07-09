/**
 * Script de test pour démontrer la récupération d'IDs Facebook
 * Ce script teste l'API Facebook avec quelques termes d'exemple
 */

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

async function searchFacebookId(suggestionLabel: string, country: string): Promise<{ id: string | null, name?: string, audience?: number }> {
  try {
    const params = new URLSearchParams({
      type: 'adinterest',
      q: suggestionLabel,
      locale: country === 'FR' ? 'fr_FR' : 'en_US',
      access_token: FACEBOOK_ACCESS_TOKEN!
    })

    console.log(`🔍 Recherche: "${suggestionLabel}" pour ${country}`)
    
    const response = await fetch(`${FACEBOOK_API_URL}?${params}`)
    
    if (!response.ok) {
      console.log(`❌ Erreur API Facebook: ${response.status} ${response.statusText}`)
      return { id: null }
    }

    const data: FacebookApiResponse = await response.json()
    
    console.log(`📊 Résultats trouvés: ${data.data.length}`)
    
    if (data.data.length > 0) {
      const result = data.data[0]
      const audience = result.audience_size_lower_bound && result.audience_size_upper_bound 
        ? Math.round((result.audience_size_lower_bound + result.audience_size_upper_bound) / 2)
        : undefined
        
      console.log(`✅ Premier résultat: "${result.name}" (ID: ${result.id})`)
      if (audience) {
        console.log(`👥 Audience: ${audience.toLocaleString()}`)
      }
      
      return { 
        id: result.id, 
        name: result.name, 
        audience 
      }
    } else {
      console.log(`❌ Aucun résultat trouvé`)
      return { id: null }
    }
    
  } catch (error) {
    console.error(`❌ Erreur:`, error)
    return { id: null }
  }
}

async function testFacebookIdRetrieval() {
  if (!FACEBOOK_ACCESS_TOKEN) {
    console.error('❌ FACEBOOK_ACCESS_TOKEN non défini dans les variables d\'environnement')
    process.exit(1)
  }

  console.log('🧪 TEST: Récupération d\'IDs Facebook')
  
  // Termes de test typiques pour les Interest Checks
  const testTerms = [
    { term: 'Coca-Cola', country: 'US' },
    { term: 'Netflix', country: 'US' },
    { term: 'Pizza', country: 'FR' },
    { term: 'Football', country: 'US' },
    { term: 'Music', country: 'US' },
    { term: 'Fashion', country: 'FR' }
  ]

  let successCount = 0
  let errorCount = 0

  for (const { term, country } of testTerms) {
    console.log('\n' + '-'.repeat(50))
    
    const result = await searchFacebookId(term, country)
    
    if (result.id) {
      successCount++
      console.log(`✅ SUCCÈS: ${term} -> ${result.id}`)
    } else {
      errorCount++
      console.log(`❌ ÉCHEC: ${term}`)
    }
    
    // Attendre entre les requêtes
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 RÉSUMÉ DU TEST:')
  console.log(`✅ Succès: ${successCount}/${testTerms.length}`)
  console.log(`❌ Échecs: ${errorCount}/${testTerms.length}`)
  console.log(`📊 Taux de succès: ${((successCount / testTerms.length) * 100).toFixed(1)}%`)
  
  if (successCount > 0) {
    console.log('\n🎉 L\'API Facebook fonctionne correctement !')
    console.log('📝 Les scripts fetch-missing-facebook-ids.ts et check-missing-facebook-ids.ts sont prêts à être utilisés.')
  } else {
    console.log('\n⚠️  Problème avec l\'API Facebook - vérifiez votre token d\'accès.')
  }
}

// Exécuter le test
testFacebookIdRetrieval()
  .then(() => {
    console.log('\n✅ Test terminé')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  }) 