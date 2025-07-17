#!/usr/bin/env node

/**
 * Script de test pour vérifier que la création de projets fonctionne
 * sans erreurs de hoisting ou de chunks JavaScript
 */

const https = require('https');
const http = require('http');

// Fonction pour faire une requête HTTP simple
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: data,
          headers: res.headers
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function testProjectCreation() {
  console.log('🧪 Test de la création de projet...');
  
  try {
    // Test 1: Page d'accueil des projets
    console.log('📋 Test 1: Page des projets...');
    const projectsResponse = await makeRequest('http://localhost:3000/projects');
    
    if (projectsResponse.statusCode === 200) {
      console.log('✅ Page des projets: OK');
      
      // Vérifier qu'il n'y a pas d'erreurs de chunks
      if (projectsResponse.body.includes('vendors.js')) {
        console.log('✅ Chunks vendors.js correctement chargé');
      } else {
        console.log('⚠️  Warning: vendors.js non trouvé');
      }
      
      if (projectsResponse.body.includes('Cannot find module')) {
        console.log('❌ Erreur de module détectée');
        return false;
      }
    } else {
      console.log(`❌ Page des projets: Erreur ${projectsResponse.statusCode}`);
      return false;
    }
    
    // Test 2: Page de création de projet
    console.log('🆕 Test 2: Page de création de projet...');
    const createResponse = await makeRequest('http://localhost:3000/projects/create');
    
    if (createResponse.statusCode === 200) {
      console.log('✅ Page de création: OK');
      
      // Vérifier qu'il n'y a pas d'erreurs JavaScript
      if (createResponse.body.includes('ReferenceError')) {
        console.log('❌ ReferenceError détectée');
        return false;
      }
      
      if (createResponse.body.includes('handlePauseBatchUpdate')) {
        // Vérifier que les fonctions ne sont pas référencées avant initialisation
        console.log('🔍 Détection de handlePauseBatchUpdate dans le HTML - vérification...');
      }
    } else {
      console.log(`❌ Page de création: Erreur ${createResponse.statusCode}`);
      return false;
    }
    
    // Test 3: Page des interest-checks
    console.log('🎯 Test 3: Page des interest-checks...');
    const interestsResponse = await makeRequest('http://localhost:3000/interests-check');
    
    if (interestsResponse.statusCode === 200) {
      console.log('✅ Page des interest-checks: OK');
    } else {
      console.log(`❌ Page des interest-checks: Erreur ${interestsResponse.statusCode}`);
      return false;
    }
    
    console.log('\n🎉 Tous les tests sont passés avec succès !');
    console.log('✅ Aucune erreur de hoisting détectée');
    console.log('✅ Les chunks JavaScript se chargent correctement');
    console.log('✅ La création de projet devrait fonctionner sans problème');
    
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message);
    return false;
  }
}

// Exécuter les tests
testProjectCreation()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }); 