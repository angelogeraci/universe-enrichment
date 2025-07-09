import { prisma } from '../src/lib/prisma'

async function checkDetailedStatus() {
  try {
    console.log('🔍 ANALYSE DÉTAILLÉE DU PROJET JNJ\n')
    
    // Récupérer le projet avec plus de détails
    const project = await prisma.project.findFirst({
      where: { slug: 'jnj' },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            processed: true,
            critereCount: true
          }
        }
      }
    })

    if (!project) {
      console.log('❌ Projet jnj non trouvé')
      return
    }

    console.log(`📦 PROJET: ${project.name}`)
    console.log(`   Status: ${project.enrichmentStatus}`)
    console.log(`   Index catégorie actuelle: ${project.currentCategoryIndex}`)
    console.log(`   Total catégories: ${project.categories.length}`)
    console.log(`   Démarré: ${project.startedAt?.toLocaleString('fr-FR') || 'N/A'}`)
    console.log(`   Terminé: ${project.completedAt?.toLocaleString('fr-FR') || 'N/A'}`)
    console.log(`   Mis à jour: ${project.updatedAt.toLocaleString('fr-FR')}`)

    if (project.pausedAt) {
      console.log(`   ⏸️  Mis en pause: ${project.pausedAt.toLocaleString('fr-FR')}`)
    }

    console.log('\n📂 STATUT DES CATÉGORIES:')
    project.categories.forEach((category, index) => {
      const status = category.processed ? '✅' : '⏳'
      console.log(`   ${index + 1}. ${status} ${category.name} (${category.critereCount || 0} critères attendus)`)
    })

    // Vérifier les critères par statut
    const critereStats = await prisma.critere.groupBy({
      by: ['status'],
      where: { projectId: project.id },
      _count: true
    })

    console.log('\n📋 STATUTS DES CRITÈRES:')
    critereStats.forEach((stat: any) => {
      console.log(`   ${stat.status}: ${stat._count} critères`)
    })

    // Vérifier les erreurs récentes
    const recentCriteres = await prisma.critere.findMany({
      where: { 
        projectId: project.id,
        status: { in: ['error', 'failed'] }
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        label: true,
        status: true,
        updatedAt: true,
        error: true
      }
    })

    if (recentCriteres.length > 0) {
      console.log('\n❌ CRITÈRES EN ERREUR:')
      recentCriteres.forEach((critere, index) => {
        console.log(`   ${index + 1}. "${critere.label}" (${critere.status})`)
        console.log(`      Mis à jour: ${critere.updatedAt.toLocaleString('fr-FR')}`)
        if (critere.error) {
          console.log(`      Erreur: ${critere.error.substring(0, 100)}...`)
        }
      })
    }

    // Vérifier s'il y a des catégories non traitées
    const unprocessedCategories = project.categories.filter(cat => !cat.processed)
    if (unprocessedCategories.length > 0) {
      console.log('\n⏳ CATÉGORIES NON TRAITÉES:')
      unprocessedCategories.forEach((category, index) => {
        console.log(`   ${index + 1}. ${category.name}`)
      })
    }

    // Calculer le total attendu vs actuel
    const totalExpected = project.categories.reduce((sum, cat) => sum + (cat.critereCount || 0), 0)
    const totalActual = critereStats.reduce((sum: number, stat: any) => sum + stat._count, 0)
    
    console.log('\n📊 BILAN:')
    console.log(`   Critères attendus: ${totalExpected}`)
    console.log(`   Critères générés: ${totalActual}`)
    console.log(`   Progression: ${totalActual}/${totalExpected} (${((totalActual/totalExpected)*100).toFixed(1)}%)`)

    if (totalActual < totalExpected && project.enrichmentStatus === 'done') {
      console.log('\n⚠️  PROBLÈME DÉTECTÉ:')
      console.log('   Le projet est marqué comme terminé mais il manque des critères!')
      console.log('   Recommandations:')
      console.log('   1. Relancer l\'enrichissement')
      console.log('   2. Vérifier les logs d\'erreur')
      console.log('   3. Vérifier la connectivité API Facebook')
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDetailedStatus() 