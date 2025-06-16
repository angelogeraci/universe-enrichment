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

async function fixProjectSlugs() {
  console.log('🔧 Génération des slugs pour les projets...')
  
  try {
    // Get all Project entries
    const projects = await prisma.project.findMany({
      select: { id: true, name: true, slug: true }
    })
    
    console.log(`📝 ${projects.length} projets trouvés`)
    
    for (const project of projects) {
      if (!project.slug) {
        let baseSlug = createSlug(project.name)
        let finalSlug = baseSlug
        let counter = 1
        
        // Check if slug already exists and generate unique one
        while (true) {
          const existing = await prisma.project.findFirst({
            where: { 
              slug: finalSlug,
              id: { not: project.id }
            }
          })
          
          if (!existing) break
          
          finalSlug = `${baseSlug}-${counter}`
          counter++
        }
        
        // Update slug
        await prisma.project.update({
          where: { id: project.id },
          data: { slug: finalSlug }
        })
        console.log(`✅ "${project.name}" -> slug: "${finalSlug}"`)
      } else {
        console.log(`⏭️  "${project.name}" -> slug déjà défini: "${project.slug}"`)
      }
    }
    
    console.log('🎉 Génération des slugs terminée !')
    
    // Verify no duplicate slugs remain
    const duplicates = await prisma.$queryRaw`
      SELECT slug, COUNT(*) as count 
      FROM "Project" 
      WHERE slug IS NOT NULL
      GROUP BY slug 
      HAVING COUNT(*) > 1
    `
    
    if (Array.isArray(duplicates) && duplicates.length > 0) {
      console.error('❌ Des doublons de slugs persistent:', duplicates)
    } else {
      console.log('✅ Aucun doublon de slug détecté')
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération des slugs:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixProjectSlugs() 