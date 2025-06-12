import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function updatePromptModels() {
  console.log('🔧 Mise à jour des modèles des prompts existants...')

  try {
    // Mettre à jour tous les prompts sans modèle défini
    const updateResult = await prisma.promptTemplate.updateMany({
      where: { 
        model: null
      },
      data: { 
        model: 'gpt-4o' 
      }
    })
    
    console.log(`✅ ${updateResult.count} prompts mis à jour avec le modèle gpt-4o`)

    // Vérifier le résultat
    const prompts = await prisma.promptTemplate.findMany({
      where: { isActive: true },
      select: { id: true, label: true, searchType: true, model: true }
    })
    
    console.log('📋 Prompts configurés:')
    prompts.forEach(p => {
      console.log(`  - ${p.label} (${p.searchType}) - Modèle: ${p.model}`)
    })

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updatePromptModels().catch(console.error) 