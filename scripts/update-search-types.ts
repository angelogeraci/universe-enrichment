import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function updateSearchTypes() {
  console.log('🔧 Mise à jour des searchType...')

  try {
    // Mettre à jour le prompt "origin"
    const originUpdate = await prisma.promptTemplate.update({
      where: { id: 'cmbqdxvws0000sj5r962kv6wy' },
      data: { searchType: 'origin' }
    })
    console.log('✅ Prompt origin mis à jour:', originUpdate.label)

    // Mettre à jour le prompt "presence"
    const presenceUpdate = await prisma.promptTemplate.update({
      where: { id: 'cmbpcq7i10000sjh18nzztmct' },
      data: { searchType: 'presence' }
    })
    console.log('✅ Prompt presence mis à jour:', presenceUpdate.label)

    // Vérifier le résultat
    const prompts = await prisma.promptTemplate.findMany({
      where: { isActive: true },
      select: { id: true, label: true, searchType: true }
    })
    
    console.log('📋 Prompts configurés:')
    prompts.forEach(p => {
      console.log(`  - ${p.label} (${p.searchType})`)
    })

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateSearchTypes() 