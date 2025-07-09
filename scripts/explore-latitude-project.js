// Charger les variables d'environnement
require('dotenv').config()

const https = require('https')

console.log('🔍 Exploration du projet Latitude.so')
console.log('===================================')

console.log('Variables d\'environnement:')
console.log('- LATITUDE_API_KEY:', process.env.LATITUDE_API_KEY ? 'Configurée ✓' : 'Manquante ✗')
console.log('- LATITUDE_PROJECT_ID:', process.env.LATITUDE_PROJECT_ID ? `${process.env.LATITUDE_PROJECT_ID} ✓` : 'Manquante ✗')

if (!process.env.LATITUDE_API_KEY || !process.env.LATITUDE_PROJECT_ID) {
  console.error('\n❌ Variables d\'environnement manquantes!')
  process.exit(1)
}

/**
 * Effectue une requête HTTPS
 */
function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : null
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers
          })
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          })
        }
      })
    })

    req.on('error', (err) => {
      reject(err)
    })

    if (body) {
      req.write(JSON.stringify(body))
    }

    req.end()
  })
}

/**
 * Explore les endpoints possibles pour découvrir les documents
 */
async function exploreProject() {
  const baseUrl = 'gateway.latitude.so'
  const projectId = process.env.LATITUDE_PROJECT_ID
  const baseHeaders = {
    'Authorization': `Bearer ${process.env.LATITUDE_API_KEY}`,
    'Content-Type': 'application/json'
  }

  const endpoints = [
    // Endpoints de base
    {
      name: 'Health Check',
      path: '/health',
      method: 'GET'
    },
    {
      name: 'Project Info',
      path: `/api/v3/projects/${projectId}`,
      method: 'GET'
    },
    {
      name: 'Project Versions',
      path: `/api/v3/projects/${projectId}/versions`,
      method: 'GET'
    },
    {
      name: 'Live Version Documents',
      path: `/api/v3/projects/${projectId}/versions/live/documents`,
      method: 'GET'
    },
    {
      name: 'Live Version Info',
      path: `/api/v3/projects/${projectId}/versions/live`,
      method: 'GET'
    },
    // Tentatives avec différents paths
    {
      name: 'Documents Root',
      path: `/api/v3/projects/${projectId}/documents`,
      method: 'GET'
    },
    {
      name: 'Commits',
      path: `/api/v3/projects/${projectId}/commits`,
      method: 'GET'
    }
  ]

  console.log('\n🧪 Test des endpoints disponibles')
  console.log('=================================')

  for (const endpoint of endpoints) {
    try {
      const options = {
        hostname: baseUrl,
        port: 443,
        path: endpoint.path,
        method: endpoint.method,
        headers: endpoint.method === 'GET' ? baseHeaders : baseHeaders
      }

      console.log(`\n📋 ${endpoint.name}`)
      console.log(`   URL: https://${baseUrl}${endpoint.path}`)
      console.log(`   Méthode: ${endpoint.method}`)

      const result = await makeRequest(options)
      
      if (result.status === 200) {
        console.log(`   ✅ SUCCÈS (${result.status})`)
        if (result.data && typeof result.data === 'object') {
          console.log(`   📄 Données:`, JSON.stringify(result.data, null, 2).substring(0, 500) + (JSON.stringify(result.data).length > 500 ? '...' : ''))
        }
      } else {
        console.log(`   ❌ ÉCHEC (${result.status})`)
        if (result.data) {
          console.log(`   📄 Erreur:`, typeof result.data === 'string' ? result.data.substring(0, 200) : JSON.stringify(result.data))
        }
      }

      // Pause entre les requêtes
      await new Promise(resolve => setTimeout(resolve, 500))

    } catch (error) {
      console.log(`   💥 ERREUR: ${error.message}`)
    }
  }

  console.log('\n🎉 Exploration terminée!')
  console.log('\n💡 Pour trouver vos prompts:')
  console.log('   1. Vérifiez les résultats ci-dessus pour voir quels endpoints fonctionnent')
  console.log('   2. Allez sur https://app.latitude.so et trouvez les paths/UUIDs de vos prompts')
  console.log('   3. Mettez à jour les UUIDs dans src/lib/enrichment-latitude.ts')
}

// Exécuter l'exploration
exploreProject().catch(console.error) 