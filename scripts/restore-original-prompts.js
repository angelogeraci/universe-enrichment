const { PrismaClient } = require('../src/generated/prisma')

const prisma = new PrismaClient()

async function restoreOriginalPrompts() {
  try {
    console.log('🔧 Restauration des prompts originaux de l\'utilisateur...')
    
    // Supprimer les prompts existants
    await prisma.promptTemplate.deleteMany({})
    console.log('🧹 Anciens prompts supprimés')
    
    // Créer les 2 prompts originaux trouvés dans les logs
    const prompts = [
      {
        id: 'cmbt63c910000sjwuc20hhgli',
        label: 'Critères originaires uniquement du pays',
        template: `Génère une liste de critères marketing pour la catégorie "{{category}}" qui sont strictement originaires du pays {{country}}.

Consignes :
- UNIQUEMENT des critères qui sont nés, créés ou ont leur origine dans {{country}}
- PAS de critères qui sont simplement populaires ou présents dans {{country}}
- Se concentrer sur l'authenticité et l'origine géographique
- Éviter les marques ou concepts internationaux adaptés localement
- Privilégier les éléments culturels, historiques, gastronomiques, artistiques genuinely originaires

Variables disponibles :
- {{category}} : La catégorie marketing ciblée
- {{categoryPath}} : Le chemin de la catégorie si disponible  
- {{country}} : Le pays d'origine à cibler

Exemples de critères originaires valides :
- Pour la France : Champagne, Roquefort, Tour Eiffel, Brigitte Bardot
- Pour l'Italie : Pasta, Ferrari, Sophia Loren, Vatican
- Pour le Japon : Sushi, Toyota, Anime, Mont Fuji

Format de réponse : Array JSON de strings uniquement.`,
        description: 'Prompt pour générer des critères strictement originaires du pays spécifié.',
        searchType: 'origin',
        model: 'gpt-4o',
        isActive: true
      },
      {
        id: 'cmbqdxvws0000sj5r962kv6wy', 
        label: 'Critères originaires ET présents dans le pays',
        template: `Génère une liste de critères marketing pour la catégorie "{{category}}" pour le pays {{country}}.

Inclure DEUX types de critères :

1. ORIGINAIRES du pays {{country}} :
   - Éléments nés, créés ou ayant leur source dans {{country}}
   - Culture locale authentique, patrimoine, traditions
   - Marques, personnalités, lieux emblématiques du pays

2. POPULAIRES/PRÉSENTS dans {{country}} :
   - Marques internationales très populaires dans {{country}}
   - Tendances culturelles adoptées massivement 
   - Phénomènes sociaux significatifs dans {{country}}
   - Éléments étrangers devenus partie de la culture locale

Variables disponibles :
- {{category}} : La catégorie marketing ciblée
- {{categoryPath}} : Le chemin de la catégorie si disponible
- {{country}} : Le pays ciblé

Équilibrer entre authenticité locale et réalité du marché.
Priorité aux éléments les plus reconnaissables et pertinents.

Format de réponse : Array JSON de strings uniquement.`,
        description: 'Prompt pour générer des critères qui sont soit originaires du pays, soit populaires dans ce pays.',
        searchType: 'presence', 
        model: 'gpt-4o',
        isActive: true
      }
    ]
    
    console.log('✨ Création des prompts originaux...')
    for (const promptData of prompts) {
      await prisma.promptTemplate.create({
        data: promptData
      })
      console.log(`✅ Prompt créé: ${promptData.label} (${promptData.searchType})`)
    }
    
    console.log('🎉 Restauration terminée !')
    
    // Vérifier le résultat
    const restoredPrompts = await prisma.promptTemplate.findMany({
      where: { isActive: true },
      select: { id: true, label: true, searchType: true, model: true }
    })
    
    console.log('📋 Prompts restaurés:')
    restoredPrompts.forEach(p => {
      console.log(`  - ${p.label} (${p.searchType}) - Modèle: ${p.model}`)
    })
    
  } catch (error) {
    console.error('❌ Erreur lors de la restauration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

restoreOriginalPrompts() 