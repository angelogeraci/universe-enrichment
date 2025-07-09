/**
 * Script de vérification pour lister les suggestions Interest Check sans ID Facebook
 */

import { prisma } from '../src/lib/prisma'

async function checkMissingFacebookIds() {
  console.log('🔍 VÉRIFICATION: Suggestions Interest Check sans ID Facebook')
  
  try {
    // Compter toutes les suggestions
    const totalSuggestions = await prisma.interestSuggestion.count()
    
    // Compter les suggestions avec ID Facebook
    const suggestionsWithId = await prisma.interestSuggestion.count({
      where: {
        facebookId: { not: null }
      }
    })
    
    // Compter les suggestions sans ID Facebook
    const suggestionsWithoutId = await prisma.interestSuggestion.count({
      where: {
        facebookId: null
      }
    })
    
    console.log('\n📊 STATISTIQUES GLOBALES:')
    console.log(`📈 Total suggestions: ${totalSuggestions}`)
    console.log(`✅ Avec ID Facebook: ${suggestionsWithId}`)
    console.log(`❌ Sans ID Facebook: ${suggestionsWithoutId}`)
    console.log(`📊 Pourcentage complété: ${((suggestionsWithId / totalSuggestions) * 100).toFixed(1)}%`)
    
    if (suggestionsWithoutId > 0) {
      console.log('\n📋 DÉTAIL DES SUGGESTIONS SANS ID FACEBOOK:')
      
      // Récupérer quelques exemples de suggestions sans ID
      const sampleSuggestions = await prisma.interestSuggestion.findMany({
        where: {
          facebookId: null
        },
        include: {
          interest: {
            include: {
              interestCheck: {
                select: {
                  name: true,
                  country: true
                }
              }
            }
          }
        },
        take: 20, // Limiter à 20 exemples
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      console.log(`\n🔍 Exemples (${Math.min(20, suggestionsWithoutId)} sur ${suggestionsWithoutId}):`)
      sampleSuggestions.forEach((suggestion, index) => {
        console.log(`${index + 1}. "${suggestion.label}" - ${suggestion.interest.interestCheck.country} (${suggestion.interest.interestCheck.name})`)
      })
      
      // Grouper par pays
      const suggestionsByCountry = await prisma.interestSuggestion.groupBy({
        by: ['id'],
        where: {
          facebookId: null
        },
        _count: {
          id: true
        }
      })
      
      // Récupérer les pays via une requête séparée car Prisma ne permet pas de groupBy sur les relations
      const countryCounts = await prisma.$queryRaw<Array<{country: string, count: bigint}>>`
        SELECT ic."country", COUNT(*)::bigint as count
        FROM "InterestSuggestion" is_
        JOIN "Interest" i ON is_."interestId" = i."id"
        JOIN "InterestCheck" ic ON i."interestCheckId" = ic."id"
        WHERE is_."facebookId" IS NULL
        GROUP BY ic."country"
        ORDER BY count DESC
      `
      
      console.log('\n🌍 RÉPARTITION PAR PAYS:')
      countryCounts.forEach(item => {
        console.log(`${item.country}: ${item.count} suggestions`)
      })
    } else {
      console.log('\n🎉 PARFAIT: Toutes les suggestions ont un ID Facebook !')
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le script
checkMissingFacebookIds()
  .then(() => {
    console.log('\n✅ Vérification terminée')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur:', error)
    process.exit(1)
  }) 