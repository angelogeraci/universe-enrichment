const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function restorePrompts() {
  try {
    console.log('🔧 Restauration des prompts précédents...')
    
    // Supprimer les prompts existants
    await prisma.promptTemplate.deleteMany({})
    console.log('🧹 Anciens prompts supprimés')
    
    // Créer les prompts avec les modèles Anthropic et OpenAI
    const prompts = [
      {
        label: 'Critères originaires uniquement (Claude 3.5 Sonnet)',
        template: `Génère une liste de critères marketing pour la catégorie "{{category}}" qui sont strictement originaires du pays {{country}}.

Consignes :
- UNIQUEMENT des critères qui sont nés, créés ou ont leur origine dans {{country}}
- PAS de critères qui sont simplement populaires ou présents dans {{country}}
- Minimum 50 critères, maximum 200 critères
- Format : un critère par ligne, sans numérotation ni puces
- Variez les types : marques, personnalités, lieux, événements, traditions, produits locaux
- Soyez précis et vérifiez que chaque critère est bien originaire de {{country}}

Catégorie : {{category}}
Pays : {{country}}

Répondez uniquement avec la liste des critères, un par ligne :`,
        description: 'Génère des critères strictement originaires du pays spécifié (Claude 3.5 Sonnet)',
        searchType: 'origin',
        model: 'claude-3-5-sonnet-20241022',
        isActive: true
      },
      {
        label: 'Critères originaires ET présents (Claude 3.5 Sonnet)',
        template: `Génère une liste de critères marketing pour la catégorie "{{category}}" incluant à la fois :
1. Les critères originaires de {{country}}
2. Les critères présents et populaires dans {{country}} (même s'ils viennent d'ailleurs)

Consignes :
- Mélangez les critères locaux ET internationaux présents dans {{country}}
- Minimum 50 critères, maximum 200 critères
- Format : un critère par ligne, sans numérotation ni puces
- Variez les types : marques locales/internationales, personnalités, lieux, événements, produits
- Privilégiez les critères populaires et reconnus dans {{country}}

Catégorie : {{category}}
Pays : {{country}}

Répondez uniquement avec la liste des critères, un par ligne :`,
        description: 'Génère des critères à la fois originaires et présents dans le pays (Claude 3.5 Sonnet)',
        searchType: 'presence',
        model: 'claude-3-5-sonnet-20241022',
        isActive: true
      },
      {
        label: 'Critères originaires uniquement (GPT-4o)',
        template: `Génère une liste de critères marketing pour la catégorie "{{category}}" qui sont strictement originaires du pays {{country}}.

Consignes :
- UNIQUEMENT des critères qui sont nés, créés ou ont leur origine dans {{country}}
- PAS de critères qui sont simplement populaires ou présents dans {{country}}
- Minimum 50 critères, maximum 200 critères
- Format : un critère par ligne, sans numérotation ni puces
- Variez les types : marques, personnalités, lieux, événements, traditions, produits locaux
- Soyez précis et vérifiez que chaque critère est bien originaire de {{country}}

Catégorie : {{category}}
Pays : {{country}}

Répondez uniquement avec la liste des critères, un par ligne :`,
        description: 'Génère des critères strictement originaires du pays spécifié (GPT-4o)',
        searchType: 'origin',
        model: 'gpt-4o',
        isActive: true
      },
      {
        label: 'Critères originaires ET présents (GPT-4o)',
        template: `Génère une liste de critères marketing pour la catégorie "{{category}}" incluant à la fois :
1. Les critères originaires de {{country}}
2. Les critères présents et populaires dans {{country}} (même s'ils viennent d'ailleurs)

Consignes :
- Mélangez les critères locaux ET internationaux présents dans {{country}}
- Minimum 50 critères, maximum 200 critères
- Format : un critère par ligne, sans numérotation ni puces
- Variez les types : marques locales/internationales, personnalités, lieux, événements, produits
- Privilégiez les critères populaires et reconnus dans {{country}}

Catégorie : {{category}}
Pays : {{country}}

Répondez uniquement avec la liste des critères, un par ligne :`,
        description: 'Génère des critères à la fois originaires et présents dans le pays (GPT-4o)',
        searchType: 'presence',
        model: 'gpt-4o',
        isActive: true
      }
    ]
    
    console.log(`🔮 Création de ${prompts.length} prompts...`)
    
    for (const promptData of prompts) {
      const prompt = await prisma.promptTemplate.create({
        data: promptData
      })
      console.log(`✅ ${prompt.label} (${prompt.model})`)
    }
    
    console.log('\n🎉 Prompts restaurés avec succès !')
    console.log('📋 Résumé :')
    console.log('  - 2 prompts avec Claude 3.5 Sonnet')
    console.log('  - 2 prompts avec GPT-4o')
    console.log('  - Types : origin & presence')
    
  } catch (error) {
    console.error('❌ Erreur lors de la restauration des prompts :', error)
  } finally {
    await prisma.$disconnect()
  }
}

restorePrompts() 