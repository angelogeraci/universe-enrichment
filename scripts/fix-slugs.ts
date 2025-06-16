import { prisma } from '../src/lib/prisma'

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

async function fixSlugs() {
  console.log('🔧 Correction des slugs CategoryList...')
  
  try {
    // Get all CategoryList entries
    const categoryLists = await prisma.categoryList.findMany({
      select: { id: true, name: true, slug: true }
    })
    
    console.log(`📝 ${categoryLists.length} listes trouvées`)
    
    for (const list of categoryLists) {
      let baseSlug = createSlug(list.name)
      let finalSlug = baseSlug
      let counter = 1
      
      // Check if slug already exists and generate unique one
      while (true) {
        const existing = await prisma.categoryList.findFirst({
          where: { 
            slug: finalSlug,
            id: { not: list.id }
          }
        })
        
        if (!existing) break
        
        finalSlug = `${baseSlug}-${counter}`
        counter++
      }
      
      // Update slug if different
      if (list.slug !== finalSlug) {
        await prisma.categoryList.update({
          where: { id: list.id },
          data: { slug: finalSlug }
        })
        console.log(`✅ "${list.name}" -> slug: "${finalSlug}"`)
      } else {
        console.log(`⏭️  "${list.name}" -> slug déjà correct: "${finalSlug}"`)
      }
    }
    
    console.log('🎉 Correction des slugs terminée !')
    
    // Verify no duplicate slugs remain
    const duplicates = await prisma.$queryRaw`
      SELECT slug, COUNT(*) as count 
      FROM "CategoryList" 
      GROUP BY slug 
      HAVING COUNT(*) > 1
    `
    
    if (Array.isArray(duplicates) && duplicates.length > 0) {
      console.error('❌ Des doublons de slugs persistent:', duplicates)
    } else {
      console.log('✅ Aucun doublon de slug détecté')
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction des slugs:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixSlugs() 