import React from "react"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from '@/lib/auth'
import { notFound } from "next/navigation"
import ProjectResults from '@/components/ProjectResults'
import StatusTag from '@/components/StatusTag'
import ProjectResultsClient from '@/components/ProjectResultsClient'

type PageProps = {
  params: Promise<{ slug: string }>
}

// Nouveau composant pour les cards de métriques seulement
function ProjectMetricsCards({ slug, enrichmentStatus, totalCategories }: { slug: string, enrichmentStatus: 'pending' | 'done', totalCategories: number }) {
  return <ProjectResultsClient slug={slug} enrichmentStatus={enrichmentStatus} totalCategories={totalCategories} onlyMetrics />
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug } = await params
  
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    notFound()
  }

  // Fetch project by slug
  const project = await prisma.project.findFirst({
    where: {
      slug: slug,
      ownerId: session.user.id
    },
    include: {
      categoryList: { include: { categories: true } }
    }
  })

  if (!project) {
    notFound()
  }
  
  // Préparer la liste des catégories pour l'export (name, path, andCriteria)
  const categoriesData = project.categoryList.categories.map((cat: any) => ({
    name: cat.name,
    path: cat.path,
    andCriteria: cat.andCriteria || []
  }))
  
  return (
    <div className="w-full px-32 py-6">
      <h1 className="text-2xl font-bold mb-6">{project.name}</h1>
      {/* Grille à 4 colonnes pour aligner toutes les cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full">
        {/* Card Détails du projet */}
        <div className="bg-white rounded-lg border p-6 flex flex-col justify-between h-full">
          <h2 className="text-lg font-semibold mb-2">Détails du projet</h2>
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Pays :</span> {project.country}</div>
            <div><span className="font-medium">Type :</span> {project.searchType}</div>
            <div><span className="font-medium">Catégories :</span> {project.categoryList.name}</div>
            <div><span className="font-medium">Status:</span> <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">{project.enrichmentStatus === 'done' ? 'Completed' : 'Pending'}</span></div>
          </div>
        </div>
        {/* Cards de métriques alignées */}
        <div className="col-span-1 flex flex-col h-full md:col-span-3">
          <ProjectResultsClient 
            slug={project.slug} 
            enrichmentStatus={project.enrichmentStatus as 'pending' | 'done'} 
            totalCategories={project.categoryList.categories.length}
            categoriesData={categoriesData}
            onlyMetrics 
          />
        </div>
      </div>
      {/* Barre de progression + zone tableau */}
      <ProjectResultsClient 
        slug={project.slug} 
        enrichmentStatus={project.enrichmentStatus as 'pending' | 'done'} 
        totalCategories={project.categoryList.categories.length} 
        categoriesData={categoriesData}
        onlyProgress 
      />
    </div>
  )
} 