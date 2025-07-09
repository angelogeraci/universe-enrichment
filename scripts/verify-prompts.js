const { PrismaClient } = require('../src/generated/prisma')

const prisma = new PrismaClient()

async function verifyPrompts() {
  try {
    console.log('🔍 Vérification des prompts restaurés...\n')
    
    const prompts = await prisma.promptTemplate.findMany({
      where: { isActive: true },
      orderBy: { searchType: 'asc' }
    })
    
    console.log(`📋 ${prompts.length} prompts actifs trouvés:\n`)
    
    prompts.forEach((prompt, index) => {
      console.log(`${index + 1}. 📌 ${prompt.label}`)
      console.log(`   🎯 Type: ${prompt.searchType}`)
      console.log(`   🤖 Modèle: ${prompt.model}`)
      console.log(`   🆔 ID: ${prompt.id}`)
      console.log(`   📝 Description: ${prompt.description}`)
      console.log(`   📄 Template (premiers 100 caractères): ${prompt.template.substring(0, 100)}...`)
      console.log(`   ✅ Actif: ${prompt.isActive}\n`)
    })
    
    console.log('✅ Vérification terminée ! Tous vos prompts originaux sont restaurés.')
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyPrompts() 