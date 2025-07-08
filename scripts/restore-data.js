const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Restauration des données de base...')

  // Créer l'utilisateur admin
  const user = await prisma.user.upsert({
    where: { email: 'angelo.geraci@soprism.com' },
    update: {},
    create: {
      email: 'angelo.geraci@soprism.com',
      password: '$2a$10$K0mQxkF1P0KUOJzqY.KGOu7GK4JXK5xW8YKJqF8AKW6vv3HdKJOr.', // admin123
      role: 'ADMIN'
    }
  })

  console.log(`✅ Utilisateur créé: ${user.email}`)

  // Créer une catégorie de test
  const categoryList = await prisma.categoryList.upsert({
    where: { slug: 'test-categories' },
    update: {},
    create: {
      name: 'Catégories de Test',
      slug: 'test-categories',
      isPublic: true,
      ownerId: user.id
    }
  })

  // Ajouter quelques catégories
  await prisma.category.createMany({
    data: [
      {
        name: 'Footballeurs',
        path: 'Sports > Football',
        andCriteria: true,
        categoryListId: categoryList.id
      },
      {
        name: 'Musiciens',
        path: 'Arts > Musique', 
        andCriteria: true,
        categoryListId: categoryList.id
      },
      {
        name: 'Influenceurs',
        path: 'Digital > Influence',
        andCriteria: false,
        categoryListId: categoryList.id
      }
    ],
    skipDuplicates: true
  })

  console.log(`✅ Catégories créées`)

  // Créer les paramètres de l'application
  await prisma.appSetting.createMany({
    data: [
      {
        key: 'facebook_token',
        value: 'EAAIrZCYcQFt8BO3ZCo0P7EbYOZCl5AJJLiVFwAhZCdPUZAJgPOUjuQJhZBWZCCZCHJANEhBmD2ZBCyZBH6D8ZBJcQJZCLdZAM2hZBOZAkZCEQJhZAZAH2BZAn8ZAHY7ZAXQJZC'
      }
    ],
    skipDuplicates: true
  })

  console.log(`✅ Paramètres créés`)
  console.log('🎉 Données restaurées avec succès!')
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 