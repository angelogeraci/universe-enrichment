// Utiliser fetch natif ou polyfill
const fetch = globalThis.fetch || require('node-fetch');

const LATITUDE_API_KEY = process.env.LATITUDE_API_KEY;
const LATITUDE_PROJECT_ID = process.env.LATITUDE_PROJECT_ID;
const BASE_URL = 'https://gateway.latitude.so/api/v3';

if (!LATITUDE_API_KEY || !LATITUDE_PROJECT_ID) {
  console.error('❌ Variables d\'environnement manquantes: LATITUDE_API_KEY et LATITUDE_PROJECT_ID');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${LATITUDE_API_KEY}`,
  'Content-Type': 'application/json'
};

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { text };
    }
    
    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    console.error('Erreur de requête:', error.message);
    throw error;
  }
}

async function testLatitudeIntegration() {
  console.log('🧪 === TEST INTÉGRATION LATITUDE.SO ===\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Test Health Check...');
    const healthResult = await makeRequest(`${BASE_URL}/health`, { headers });
    console.log('✅ Health check:', healthResult.data);
    console.log();

    // Test 2: Test des deux prompts avec les bons paths
    const testCases = [
      {
        name: 'Origin Only (France/Technologie)',
        path: 'CriteriaDiscoverOriginOnly',
        parameters: {
          country: 'France',
          category: 'Technologie'
        }
      },
      {
        name: 'Origin + Presence (Belgique/Arts)',
        path: 'CriteriaDiscoverOriginPresent',
        parameters: {
          country: 'Belgique',
          category: 'Arts'
        }
      }
    ];

    for (const testCase of testCases) {
      console.log(`2️⃣ Test ${testCase.name}...`);
      console.log(`📋 Path: ${testCase.path}`);
      console.log(`📤 Paramètres:`, testCase.parameters);

      const runResult = await makeRequest(`${BASE_URL}/projects/${LATITUDE_PROJECT_ID}/versions/live/documents/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          path: testCase.path,
          parameters: testCase.parameters,
          stream: false
        })
      });

      if (!runResult.ok) {
        console.error(`❌ Erreur HTTP ${runResult.status}:`, runResult.data);
        continue;
      }

      const runData = runResult.data;
      console.log('✅ Réponse reçue:');
      console.log('   📊 UUID:', runData.uuid);
      console.log('   🤖 Modèle:', runData.response?.config?.model || 'N/A');
      console.log('   📝 Tokens:', runData.response?.usage || 'N/A');
      
      // Parser et afficher les critères
      const responseText = runData.response?.text || '';
      const criteria = parseCriteria(responseText);
      console.log(`   🎯 Critères générés (${criteria.length}):`);
      criteria.slice(0, 10).forEach((criterion, index) => {
        console.log(`      ${index + 1}. ${criterion}`);
      });
      if (criteria.length > 10) {
        console.log(`      ... et ${criteria.length - 10} autres`);
      }
      console.log();
    }

    // Test 3: Récupération d'un document existant
    console.log('3️⃣ Test récupération document...');
    const getResult = await makeRequest(`${BASE_URL}/projects/${LATITUDE_PROJECT_ID}/versions/live/documents/path/CriteriaDiscoverOriginOnly`, {
      headers
    });

    if (getResult.ok) {
      const getData = getResult.data;
      console.log('✅ Document récupéré:');
      console.log('   📄 Path:', getData.path);
      console.log('   🏷️  Titre:', getData.title || 'N/A');
      console.log('   📊 Provider:', getData.config?.provider || 'N/A');
      console.log('   🤖 Modèle:', getData.config?.model || 'N/A');
    } else {
      console.log('❌ Erreur récupération document:', getResult.data);
    }

    console.log('\n🎉 Tests terminés avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
    process.exit(1);
  }
}

function parseCriteria(responseText) {
  try {
    // Essayer de parser directement comme JSON
    const parsed = JSON.parse(responseText);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => typeof item === 'string' && item.trim().length > 0);
    }
  } catch (e) {
    // Si ce n'est pas du JSON direct, chercher un tableau JSON dans le texte
    const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => typeof item === 'string' && item.trim().length > 0);
        }
      } catch (e2) {
        // Fallback: parser ligne par ligne
      }
    }
  }

  // Fallback: extraire les critères ligne par ligne
  return responseText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('//'))
    .map(line => line.replace(/^[-*•]\s*/, '').replace(/^"\s*/, '').replace(/\s*"$/, ''))
    .filter(line => line.length > 3);
}

// Exécuter les tests
testLatitudeIntegration(); 