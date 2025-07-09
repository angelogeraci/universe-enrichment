/**
 * Script de test pour vérifier la récupération de l'ID Facebook
 */

async function testFacebookId() {
  try {
    console.log('🧪 TEST: Récupération ID Facebook depuis l\'API')
    
    const response = await fetch('http://localhost:3000/api/facebook/suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Log-Type': 'TEST_FACEBOOK_ID'
      },
      body: JSON.stringify({
        critere: 'Coca Cola',
        query: 'Coca Cola',
        country: 'FR',
        retryAttempt: 0,
        maxRetries: 1
      })
    })

    if (response.ok) {
      const data = await response.json()
      
      console.log('📊 RÉSULTATS du test:')
      console.log(`- Nombre de suggestions: ${data.suggestions?.length || 0}`)
      
      if (data.suggestions && data.suggestions.length > 0) {
        data.suggestions.slice(0, 3).forEach((suggestion: any, index: number) => {
          const idStatus = suggestion.facebookId ? '✅ ID OK' : '❌ ID MANQUANT'
          console.log(`  ${index + 1}. "${suggestion.label}"`)
          console.log(`     📝 Facebook ID: ${suggestion.facebookId || 'N/A'} ${idStatus}`)
          console.log(`     👥 Audience: ${suggestion.audience?.toLocaleString() || 'N/A'}`)
          console.log(`     🎯 Score: ${suggestion.similarityScore || 'N/A'}%`)
          console.log('')
        })
        
        const withId = data.suggestions.filter((s: any) => s.facebookId).length
        const withoutId = data.suggestions.length - withId
        
        console.log(`📈 BILAN:`)
        console.log(`  ✅ Avec ID Facebook: ${withId}`)
        console.log(`  ❌ Sans ID Facebook: ${withoutId}`)
        console.log(`  📊 Taux de récupération: ${((withId / data.suggestions.length) * 100).toFixed(1)}%`)
      } else {
        console.log('⚠️ Aucune suggestion trouvée')
      }
    } else {
      console.error(`❌ Erreur API: ${response.status}`)
      const error = await response.text()
      console.error(error)
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error)
  }
}

// Exécuter le test
testFacebookId() 