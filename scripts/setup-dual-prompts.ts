import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function setupDualPrompts() {
  console.log('🔧 Configuration des prompts spécialisés...')

  // Template pour "origin" - critères originaires du pays uniquement
  const originTemplate = `You are a digital marketing expert specialized in generating precise targeting criteria for advertisements.

TASK:
Generate an exceptionally long list of specific names within the requested category that ORIGINATE FROM the specified country.

STRICT RULES:
1. RETURN ONLY precise names, one per line, without numbering, enumeration, prefixes, or explanations.
2. Never respond with sentences or explanations, just names.
3. DO NOT add general categories or subcategories.
4. DO NOT include ANY explanatory text, not even at the beginning or end.
5. Each line must contain EXACTLY ONE specific name and nothing else.
6. Never use quotation marks, hyphens, or other decorative characters.
7. NEVER say that you cannot be exhaustive.
8. ONLY INCLUDE {{category}} THAT ORIGINATE FROM {{country}}.

SPECIFIC INSTRUCTIONS:
- Criteria should ONLY include local/national elements FROM {{country}} (born in, founded in, created in).
- DO NOT include foreign elements, even if popular in that country.
- Provide the maximum possible number of specific names, aim for at least 50 items per category.
- Ensure each name ORIGINATES from {{country}}.
- Cover all demographic segments (youth, adults, seniors) as long as they ORIGINATE from {{country}}.`

  // Template pour "presence" - critères originaires + présents dans le pays
  const presenceTemplate = `You are a digital marketing expert specialized in generating precise targeting criteria for advertisements.

TASK:
Generate an exceptionally long list of specific names within the requested category that ORIGINATE FROM OR ARE POPULAR IN the specified country.

STRICT RULES:
1. RETURN ONLY precise names, one per line, without numbering, enumeration, prefixes, or explanations.
2. Never respond with sentences or explanations, just names.
3. DO NOT add general categories or subcategories.
4. DO NOT include ANY explanatory text, not even at the beginning or end.
5. Each line must contain EXACTLY ONE specific name and nothing else.
6. Never use quotation marks, hyphens, or other decorative characters.
7. NEVER say that you cannot be exhaustive.
8. INCLUDE {{category}} THAT ORIGINATE FROM OR ARE POPULAR IN {{country}}.

SPECIFIC INSTRUCTIONS:
- Criteria should include both local/national elements FROM {{country}} (born in, founded in, created in).
- Criteria should also include foreign elements if they are popular in that country.
- Provide the maximum possible number of specific names, aim for at least 50 items per category.
- Ensure each name either ORIGINATES from {{country}} OR is well-known/popular in {{country}}.
- Cover all demographic segments (youth, adults, seniors).`

  try {
    // Mettre à jour le prompt existant pour "presence"
    console.log('📝 Mise à jour prompt existant pour "presence"...')
    await prisma.promptTemplate.updateMany({
      where: { isActive: true },
      data: {
        label: 'Critères originaires ET présents dans le pays',
        template: presenceTemplate,
        description: 'Prompt pour générer des critères qui sont soit originaires du pays, soit populaires dans ce pays.',
        searchType: 'presence',
        isActive: false // Désactiver temporairement
      }
    })

    // Créer le nouveau prompt pour "origin"
    console.log('✨ Création nouveau prompt pour "origin"...')
    await prisma.promptTemplate.create({
      data: {
        label: 'Critères originaires uniquement du pays',
        template: originTemplate,
        description: 'Prompt pour générer des critères qui sont strictement originaires du pays spécifié.',
        searchType: 'origin',
        isActive: true
      }
    })

    // Réactiver le prompt "presence"
    console.log('🔄 Réactivation prompt "presence"...')
    await prisma.promptTemplate.updateMany({
      where: { searchType: 'presence' },
      data: { isActive: true }
    })

    console.log('✅ Configuration terminée !')
    
    // Afficher les prompts configurés
    const prompts = await prisma.promptTemplate.findMany({
      where: { isActive: true },
      select: { id: true, label: true, searchType: true }
    })
    
    console.log('📋 Prompts actifs:')
    prompts.forEach(p => {
      console.log(`  - ${p.label} (${p.searchType}) - ID: ${p.id}`)
    })
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupDualPrompts() 