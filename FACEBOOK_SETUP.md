# Configuration Facebook Marketing API

## Prérequis

Pour utiliser l'intégration Facebook dans votre application, vous devez configurer la variable d'environnement suivante :

```bash
# Facebook Marketing API - SEULE VARIABLE REQUISE
FACEBOOK_ACCESS_TOKEN="votre-token-ici"
```

**✅ IMPORTANT :** Vous n'avez plus besoin de `FACEBOOK_AD_ACCOUNT_ID`. Le nouveau système utilise uniquement le token d'accès.

## Obtention du Token d'accès Facebook

### 1. Créer une application Facebook

1. Allez sur [Facebook Developers](https://developers.facebook.com/)
2. Créez une nouvelle application
3. Sélectionnez "Business" comme type d'utilisation
4. Ajoutez le produit "Marketing API"

### 2. Générer un token d'accès

#### Option A : Via l'Explorateur d'API Graph (Recommandé pour les tests)

1. Allez sur [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Sélectionnez votre application
3. Cliquez sur "Generate Access Token"
4. Accordez les permissions :
   - `public_profile` (permission de base)
   - `pages_read_engagement` (optionnel)
5. Copiez le token généré

#### Option B : Via votre application (Production)

1. Implémentez le flux OAuth 2.0 
2. Demandez les permissions appropriées
3. Récupérez le token d'accès longue durée

### 3. Vérifier votre token

Testez votre token avec cette requête :
```bash
curl "https://graph.facebook.com/v18.0/me?access_token=VOTRE_TOKEN"
```

## Fonctionnalités disponibles

### ✅ Recherche d'intérêts Facebook
- Trouve automatiquement les intérêts Facebook similaires à vos critères
- Calcule un score de similarité intelligent
- Fonctionne avec le token d'accès de base

### ✅ Estimation d'audience par pays
Le système utilise trois méthodes pour estimer l'audience :

1. **API Facebook directe** : Récupère les données d'audience globales via l'API Graph
2. **Facteurs de pays intelligents** : Applique des facteurs démographiques réalistes par pays
3. **Estimation de secours** : Utilise des estimations basées sur la taille du marché

#### Facteurs de pays supportés
- **États-Unis** : 15% de l'audience globale
- **Allemagne** : 6% de l'audience globale  
- **France** : 5% de l'audience globale
- **Belgique** : 1% de l'audience globale
- **35+ autres pays européens** avec facteurs spécifiques

### ✅ Interface utilisateur intégrée
- Boutons "Get Facebook" à côté de chaque critère
- Affichage des suggestions avec scores de similarité
- Indicateurs "Best Match" automatiques
- Formatage intelligent des audiences (1.2M, 45K, etc.)

## Structure des données

### SuggestionFacebook
```typescript
{
  id: string
  critereId: string
  label: string           // Nom de l'intérêt Facebook
  audience: number        // Estimation audience pour le pays
  similarityScore: number // Score 0-1 de similarité
  isBestMatch: boolean    // Marquage automatique de la meilleure suggestion
  isSelectedByUser: boolean // Sélection manuelle par l'utilisateur
}
```

## Exemples de résultats

Pour le critère "Audi" en Allemagne :
- **Audi A3** : 1.2M personnes (57% similaire) 🏆 Best Match
- **Audi TT** : 800K personnes (45% similaire)  
- **BMW M3** : 750K personnes (23% similaire)

## Dépannage

### Erreur "Invalid OAuth access token"
- Vérifiez que votre token est correct
- Générez un nouveau token si nécessaire
- Assurez-vous que l'application Facebook est active

### Aucune suggestion trouvée
- Le terme de recherche est peut-être trop spécifique
- Essayez des termes plus génériques
- Vérifiez les logs serveur pour plus de détails

### Audiences à 0
- **Résolu** : Le nouveau système n'utilise plus l'Account ID
- Les estimations sont maintenant basées sur l'API Graph directe
- En cas d'échec API, le système utilise des estimations intelligentes

## Avantages du nouveau système

✅ **Plus simple** - Seul le token d'accès est requis  
✅ **Plus robuste** - Pas de dépendance sur les permissions Account ID  
✅ **Estimations réalistes** - Facteurs démographiques précis par pays  
✅ **Fallback intelligent** - Toujours une estimation même si l'API échoue  
✅ **Support étendu** - 35+ pays avec facteurs spécifiques 

# Configuration Facebook Ads API

## Présentation

Le système d'enrichissement utilise l'API Facebook Marketing pour trouver des intérêts publicitaires pertinents basés sur les critères générés par OpenAI. Cette approche permet de créer des campagnes publicitaires ultra-ciblées.

## Configuration

### 1. Clés API Facebook
Créez un fichier `.env` à la racine du projet avec :
```
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token_here
```

### 2. Génération du token d'accès
1. Allez sur [Facebook for Developers](https://developers.facebook.com/)
2. Créez une application
3. Ajoutez le produit "Marketing API"
4. Générez un token d'accès avec les permissions `ads_read`

## Fonctionnement du Système

### Architecture
- **Recherche**: L'API Graph de Facebook recherche des intérêts publicitaires
- **Scoring**: Algorithme avancé pour évaluer la pertinence
- **Sélection**: Le meilleur match est automatiquement identifié
- **Interface**: Affichage avec dropdown pour explorer toutes les suggestions

## 🚀 Améliorations du Système de Scoring v2.0

### Problèmes Résolus

#### 1. Problème Ford Ka vs Ford Motor Company
**Problème**: L'ancien algorithme sélectionnait parfois des modèles spécifiques (ex: "Ford Ka") au lieu des marques principales (ex: "Ford Motor Company").

**Solution**: 
- **Nouveau score de marque (30% du score final)**: Privilégie les entités avec des indicateurs de marque
- **Détection de patterns de modèles**: Identifie et pénalise les modèles spécifiques
- **Bonus pour indicateurs de marque**: +0.5 pour "Company", "Motor", "Corp", etc.
- **Malus pour modèles**: -0.4 pour les patterns "Marque Modèle" (ex: "Ford Ka")

#### 2. Système de Seuils de Pertinence
**Nouveau**: Classifications automatiques des suggestions :

| Niveau | Score | Description | Action |
|--------|-------|-------------|---------|
| 🟢 Très haute | ≥80% | Correspondance parfaite | Auto-sélection recommandée |
| 🟡 Haute | ≥60% | Très bonne correspondance | Sélection recommandée |
| 🟠 Moyenne | ≥30% | Correspondance acceptable | Révision recommandée |
| 🔴 Faible | 15-29% | Correspondance douteuse | **NON PERTINENTE** |
| ⚫ Non pertinente | <15% | Pas de correspondance | **REJETÉE** |

### Nouvelle Pondération des Scores

```typescript
const finalScore = (
  textualSimilarity * 0.25 +    // 25% - Similarité textuelle (réduit)
  contextualScore * 0.25 +      // 25% - Pertinence contextuelle  
  brandScore * 0.30 +           // 30% - NOUVEAU: Score marque (priorité élevée)
  audienceScore * 0.15 +        // 15% - Taille audience (réduit)
  interestTypeScore * 0.05      // 5% - Type d'intérêt (réduit)
)
```

### Interface Utilisateur Améliorée

#### Indicateurs Visuels de Qualité
- 🟢 **Point vert**: Haute qualité (≥60%)
- 🟡 **Point jaune**: Qualité moyenne (30-59%)
- 🔴 **Point rouge**: Faible qualité (<30%) - NON PERTINENTE

#### Badges de Statut
- **Selected**: Sélection manuelle de l'utilisateur
- **Best**: Meilleure suggestion automatique
- **Low**: Suggestion non pertinente (affiché en rouge)

#### Affichage des Suggestions Non Pertinentes
- Opacité réduite (60%)
- Badge rouge "Low"
- Mention "NON PERTINENTE" en rouge
- Exclusion de la sélection automatique "Best Match"

### Logs Améliorés

Le système fournit maintenant des logs détaillés :
```
🏷️ Analyse marque/modèle pour: "Ford Motor Company"
✅ Indicateur marque trouvé: "motor" → +0.3
✅ Indicateur marque trouvé: "company" → +0.3
🎯 Marque principale détectée: "ford" + indicateur → +0.5
🏆 Score marque final: 85% (bonus: 1.1, malus: 0)

🎯 SCORE FINAL: 82% - très_haute - Marque principale détectée. Grande audience. [TRÈS_HAUTE]
```

### Statistiques de Qualité

Le système fournit maintenant des métriques de qualité :
- **Nombre de suggestions pertinentes vs non pertinentes**
- **Score de qualité global** (% de suggestions pertinentes)
- **Meilleur match identifié** uniquement parmi les suggestions pertinentes

### Cas d'Usage - Exemple Ford

**Avant**: 
- "Ford Ka" pourrait être sélectionné (score: 85%)
- "Ford Motor Company" en 2ème position (score: 78%)

**Après**:
- "Ford Motor Company" sélectionné (score: 92%) ✅
- "Ford Ka" marqué comme modèle (score: 45%) 🔴
- Interface indique clairement la différence

## Recommandations d'Utilisation

### Pour les Marques Automobiles
✅ **Rechercher**: Noms de marques (Ford, BMW, Audi)  
❌ **Éviter**: Noms de modèles spécifiques (Ford Ka, BMW X5)

### Révision des Suggestions
- **Score ≥60%**: Utiliser directement
- **Score 30-59%**: Réviser et valider
- **Score <30%**: Chercher des alternatives

### Optimisation des Campagnes
- Privilégier les suggestions avec indicateurs de qualité verts
- Utiliser les suggestions "Best" pour un targeting optimal
- Ignorer les suggestions marquées "Low" ou "NON PERTINENTE"

## Support Technique

Pour toute question sur l'utilisation du système de scoring Facebook, consultez les logs détaillés disponibles dans l'interface d'administration ou contactez l'équipe technique. 