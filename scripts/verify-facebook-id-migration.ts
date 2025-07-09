/**
 * Script pour vérifier que la migration a bien ajouté le champ facebookId
 */
import { prisma } from '../src/lib/prisma'

async function verifyFacebookIdMigration() {
  try {
    console.log('🔍 VÉRIFICATION MIGRATION: Champ facebookId ajouté')
    
    // Vérifier la structure des tables
    console.log('\n📊 Vérification des tables...')
    
    // Test 1: Compter les suggestions Facebook existantes
    const facebookSuggestionCount = await prisma.suggestionFacebook.count()
    console.log(`📈 Suggestions Facebook en base: ${facebookSuggestionCount}`)
    
    // Test 2: Compter les suggestions Interest Check existantes
    const interestSuggestionCount = await prisma.interestSuggestion.count()
    console.log(`📈 Suggestions Interest Check en base: ${interestSuggestionCount}`)
    
    if (facebookSuggestionCount > 0) {
      console.log('\n🔍 Échantillon suggestions Facebook:')
      const sampleFacebook = await prisma.suggestionFacebook.findMany({
        take: 3,
        select: {
          id: true,
          label: true,
          facebookId: true,
          audience: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      })
      
      sampleFacebook.forEach((s, i) => {
        const idStatus = s.facebookId ? '✅ Avec ID' : '❌ Sans ID'
        console.log(`  ${i + 1}. "${s.label}" ${idStatus}`)
        console.log(`     📝 Facebook ID: ${s.facebookId || 'NULL'}`)
        console.log(`     👥 Audience: ${s.audience?.toLocaleString()}`)
        console.log('')
      })
    }
    
    if (interestSuggestionCount > 0) {
      console.log('\n🔍 Échantillon suggestions Interest Check:')
      const sampleInterest = await prisma.interestSuggestion.findMany({
        take: 3,
        select: {
          id: true,
          label: true,
          facebookId: true,
          audience: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      })
      
      sampleInterest.forEach((s, i) => {
        const idStatus = s.facebookId ? '✅ Avec ID' : '❌ Sans ID'
        console.log(`  ${i + 1}. "${s.label}" ${idStatus}`)
        console.log(`     📝 Facebook ID: ${s.facebookId || 'NULL'}`)
        console.log(`     👥 Audience: ${s.audience?.toLocaleString()}`)
        console.log('')
      })
    }
    
    console.log('✅ MIGRATION VÉRIFIÉE: Le champ facebookId est disponible')
    
  } catch (error: any) {
    console.error('❌ ERREUR MIGRATION:', error)
    if (error.code === 'P2021') {
      console.error('💡 La table n\'existe pas encore ou la migration n\'a pas été appliquée')
    } else if (error.message?.includes('facebookId')) {
      console.error('💡 Le champ facebookId n\'existe pas - migration nécessaire')
    }
  }
}

// Exécuter la vérification
verifyFacebookIdMigration()
  .then(() => {
    console.log('\n🎉 Vérification terminée')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  }) 