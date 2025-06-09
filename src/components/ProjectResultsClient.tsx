'use client'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import ProjectResults, { Critere } from './ProjectResults'

type EnrichmentStatus = 'pending' | 'processing' | 'done' | 'error'

export function ProjectResultsClient({ slug, enrichmentStatus: initialStatus, totalCategories, onlyMetrics = false, onlyProgress = false }: { 
  slug: string, 
  enrichmentStatus: EnrichmentStatus, 
  totalCategories: number,
  onlyMetrics?: boolean,
  onlyProgress?: boolean
}) {
  const [currentStatus, setCurrentStatus] = useState<EnrichmentStatus>(initialStatus)

  if (totalCategories === 0) {
    return <div className="py-12 text-center text-destructive">Aucune catégorie trouvée pour ce projet. Impossible de générer des critères IA.</div>
  }
  
  const fetcher = (url: string) => fetch(url).then(res => res.json())
  
  // Fetch des critères seulement si done ou si on veut les voir en temps réel pendant processing
  const { data, error, isLoading } = useSWR<{ criteres: Critere[] }>(
    currentStatus === 'done' || currentStatus === 'processing' ? `/api/projects/slug/${slug}/criteres` : null,
    fetcher,
    {
      // Polling toutes les 2 secondes si en cours de traitement
      refreshInterval: currentStatus === 'processing' ? 2000 : 0,
      revalidateOnFocus: false
    }
  )

  // Polling du statut du projet pendant le traitement
  const { data: projectData } = useSWR(
    currentStatus === 'processing' ? `/api/projects/slug/${slug}/status` : null,
    fetcher,
    {
      refreshInterval: 2000,
      revalidateOnFocus: false
    }
  )

  // Mettre à jour le statut local quand le statut du projet change
  useEffect(() => {
    if (projectData?.enrichmentStatus && projectData.enrichmentStatus !== currentStatus) {
      setCurrentStatus(projectData.enrichmentStatus as EnrichmentStatus)
    }
  }, [projectData, currentStatus])

  // Debug : log des données reçues
  console.log('CRITERES DATA', data, 'ERROR', error, 'STATUS', currentStatus)

  // Gestion d'erreur structurelle
  if (currentStatus === 'error') {
    return <div className="py-12 text-center text-destructive">Erreur lors de l'enrichissement IA. Veuillez réessayer ou contacter le support.</div>
  }

  if (currentStatus === 'done' && !isLoading && (!data || !Array.isArray(data.criteres))) {
    return <div className="py-12 text-center text-destructive">Erreur : Données IA manquantes ou mal structurées. Vérifie la génération côté backend/OpenAI.</div>
  }
  
  // Calcul des métriques
  const criteres = data?.criteres || []
  const metrics = {
    aiCriteria: criteres.length,
    withFacebook: criteres.filter(c => c.suggestions && c.suggestions.length > 0).length,
    valid: criteres.filter(c => c.status === 'valid').length
  }
  
  // Progression : on considère 1 critère par catégorie (à affiner si besoin)
  const getProgressStep = (status: EnrichmentStatus): string => {
    switch (status) {
      case 'done': return 'Completed'
      case 'processing': return 'Enriching with AI...'
      case 'error': return 'Error occurred'
      case 'pending': return 'Starting...'
      default: return 'Unknown status'
    }
  }

  const progress = {
    current: criteres.length,
    total: totalCategories,
    step: getProgressStep(currentStatus),
    errors: currentStatus === 'error' ? 1 : 0,
    eta: currentStatus === 'processing' ? 'Estimating...' : '-'
  }

  // Mode onlyMetrics : retourner seulement les cards de métriques
  if (onlyMetrics) {
    return <ProjectResults onlyMetrics metrics={metrics} />
  }

  // Mode onlyProgress : retourner seulement la progression et tableau
  if (onlyProgress) {
    if (currentStatus === 'processing') {
      return <ProjectResults onlyProgress progress={progress} metrics={metrics} />
    }
    if (currentStatus !== 'done') {
      return <ProjectResults onlyProgress progress={progress} />
    }
    if (isLoading) {
      return <div className="py-12 text-center text-muted-foreground">Chargement des critères...</div>
    }
    if (error) {
      return <div className="py-12 text-center text-destructive">Erreur lors du chargement des critères.</div>
    }
    if (criteres.length === 0) {
      return <div className="py-12 text-center text-destructive">Aucun critère généré par l'IA pour ce projet.</div>
    }
    return <ProjectResults isComplete criteriaData={criteres} progress={progress} onlyProgress />
  }

  // Mode normal (complet)
  if (currentStatus === 'processing') {
    return (
      <ProjectResults progress={progress} metrics={metrics} />
    )
  }
  if (currentStatus !== 'done') {
    return (
      <ProjectResults progress={progress} metrics={metrics} />
    )
  }
  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Chargement des critères...</div>
  }
  if (error) {
    return <div className="py-12 text-center text-destructive">Erreur lors du chargement des critères.</div>
  }
  if (criteres.length === 0) {
    return <div className="py-12 text-center text-destructive">Aucun critère généré par l'IA pour ce projet.</div>
  }
  return (
    <ProjectResults isComplete criteriaData={criteres} metrics={metrics} progress={progress} />
  )
}

export default ProjectResultsClient 