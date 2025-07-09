# Configuration de Latitude.so

## Vue d'ensemble

Latitude.so est une plateforme open-source de prompt engineering qui permet de gérer vos prompts de manière centralisée, avec versioning et collaboration d'équipe.

## Avantages par rapport au système local

✅ **Gestion centralisée** des prompts  
✅ **Versioning** automatique  
✅ **Collaboration** d'équipe  
✅ **Évaluations** et amélioration continue  
✅ **API Gateway** - Déploiement en tant qu'endpoints  
✅ **Monitoring** et observabilité  
✅ **Pas de gestion de base de données** pour les prompts  

## Options de déploiement

### Option 1: Latitude Cloud (Recommandé)
- ✅ Service géré par Latitude
- ✅ Déploiement immédiat  
- ✅ Tier gratuit: 40k runs/mois
- ✅ API Gateway inclus

### Option 2: Self-hosted
- ✅ Installation sur votre infrastructure
- ✅ Contrôle total
- ✅ Open-source (LGPL-3.0)

## Configuration

### 1. Créer un compte Latitude.so

1. Allez sur [https://latitude.so](https://latitude.so)
2. Créez votre compte
3. Créez un nouveau projet
4. Récupérez votre **API Key** et **Project ID**

### 2. Configurer les variables d'environnement

Ajoutez ces variables à votre fichier `.env.local` :

```bash
# Clés API pour Latitude.so
LATITUDE_API_KEY="votre_clé_api_latitude"
LATITUDE_PROJECT_ID="votre_project_id_latitude"

# Optionnel: URL de base personnalisée (pour self-hosted)
LATITUDE_BASE_URL="https://gateway.latitude.so"
```

### 3. Créer vos prompts sur Latitude.so

Vous devez créer **2 prompts** dans votre projet Latitude.so :

#### Prompt 1: "criteres-originaires-uniquement"
**Variables attendues:** `category`, `country`, `additional_context`

**Exemple de contenu:**
```
Tu es un expert en recherche d'entités pour {{category}} originaires uniquement de {{country}}.

Génère une liste de critères de recherche spécifiques pour identifier des {{category}} qui sont originaires de {{country}}.

Catégorie: {{category}}
Pays: {{country}}
Contexte additionnel: {{additional_context}}

Critères de recherche (un par ligne, sans numérotation):
```

#### Prompt 2: "criteres-originaires-et-presents"
**Variables attendues:** `category`, `country`, `additional_context`

**Exemple de contenu:**
```
Tu es un expert en recherche d'entités pour {{category}} originaires ET présents dans {{country}}.

Génère une liste de critères de recherche spécifiques pour identifier des {{category}} qui sont à la fois originaires de {{country}} ET qui y ont une présence active.

Catégorie: {{category}}
Pays: {{country}}
Contexte additionnel: {{additional_context}}

Critères de recherche (un par ligne, sans numérotation):
```

### 4. Tester l'intégration

Exécutez le script de test :

```bash
# Assurez-vous que votre app Next.js est lancée
npm run dev

# Dans un autre terminal
node scripts/test-latitude-integration.js
```

## Utilisation de l'API

### Endpoint principal

```
POST /api/enrichment-latitude
```

### Exemple de requête

```javascript
const response = await fetch('/api/enrichment-latitude', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    category: 'Musicians',
    country: 'BE',
    searchType: 'origin', // ou 'presence'
    additionalContext: 'Focus on rock and pop artists' // optionnel
  })
});

const data = await response.json();
```

### Exemple de réponse

```json
{
  "success": true,
  "data": {
    "criteria": [
      "Né en Belgique",
      "Formation musicale belge",
      "Label de musique belge"
    ],
    "metadata": {
      "promptUsed": "criteres-originaires-uniquement",
      "model": "latitude-managed",
      "country": "BE",
      "category": "Musicians",
      "searchType": "origin"
    }
  },
  "provider": "latitude.so",
  "timestamp": "2025-01-26T10:30:00.000Z"
}
```

## Monitoring et observabilité

Latitude.so fournit automatiquement :
- 📊 **Logs** de toutes les requêtes
- 📈 **Métriques** de performance
- 🔍 **Debugging** des prompts
- 📋 **Historique** des versions

## Migration depuis le système local

1. **Parallèle** : Utilisez l'endpoint `/api/enrichment-latitude` en parallèle de l'ancien système
2. **Test** : Comparez les résultats
3. **Basculement** : Remplacez progressivement les appels vers l'ancien système
4. **Nettoyage** : Supprimez l'ancien code quand tout fonctionne

## Troubleshooting

### Erreur de connexion
```bash
# Vérifiez la santé de l'API
curl http://localhost:3000/api/enrichment-latitude
```

### Vérifiez vos clés API
```bash
# Dans votre fichier .env.local
echo $LATITUDE_API_KEY
echo $LATITUDE_PROJECT_ID
```

### Logs détaillés
Consultez les logs de votre application Next.js pour voir les erreurs détaillées.

## Support

- 📚 [Documentation Latitude.so](https://docs.latitude.so)
- 💬 [Slack Community](https://latitude-community.slack.com)
- 🐛 [GitHub Issues](https://github.com/latitude-dev/latitude-llm/issues) 