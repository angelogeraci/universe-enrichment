import React from "react"
import prisma from "@/lib/prisma"
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
  
  return (
    <div className="w-full px-32 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <nav className="text-sm text-muted-foreground mb-2">
            <span>Projets</span> <span className="mx-2">›</span> <span className="text-foreground">{project.name}</span>
          </nav>
          <h1 className="text-2xl font-bold">{project.name}</h1>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-2">Détails du projet</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Description:</span> {project.description}</p>
            <p><span className="font-medium">Pays:</span> {project.country}</p>
            <p><span className="font-medium">Type de recherche:</span> {project.searchType}</p>
            <p><span className="font-medium">Liste de catégories:</span> {project.categoryList.name}</p>
            <p><span className="font-medium">Status:</span> <StatusTag status={project.enrichmentStatus as 'pending' | 'done'} /></p>
          </div>
        </div>
        {/* Cards de métriques sur la même ligne */}
        <ProjectMetricsCards slug={project.slug} enrichmentStatus={project.enrichmentStatus as 'pending' | 'done'} totalCategories={project.categoryList.categories.length} />
      </div>
      {/* Barre de progression + zone tableau */}
      <ProjectResultsClient slug={project.slug} enrichmentStatus={project.enrichmentStatus as 'pending' | 'done'} totalCategories={project.categoryList.categories.length} onlyProgress />
    </div>
  )
} 