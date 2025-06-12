'use client'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import ProjectResults, { Critere } from './ProjectResults'

type EnrichmentStatus = 'pending' | 'processing' | 'done' | 'error'

interface ProgressData {
  enrichmentStatus: EnrichmentStatus
  progress: {
    current: number
    total: number
    step: string
    percentage: number
    errors: number
    eta: string
  }
  metrics: {
    aiCriteria: number
    withFacebook: number
    valid: number
    totalCategories: number
  }
  details: {
    categoriesProcessed: number
    criteresGenerated: number
    facebookSuggestionsObtained: number
    validCriteres: number
  }
}

export function ProjectResultsClient({ slug, enrichmentStatus: initialStatus, totalCategories, onlyMetrics = false, onlyProgress = false, categoriesData = [] }: { 
  slug: string, 
  enrichmentStatus: EnrichmentStatus, 
  totalCategories: number,
  onlyMetrics?: boolean,
  onlyProgress?: boolean,
  categoriesData?: Array<{ name: string, path: string[], andCriteria?: string[] }>
}) {
  const [currentStatus, setCurrentStatus] = useState<EnrichmentStatus>(initialStatus)

  if (totalCategories === 0) {
    return <div className="py-12 text-center text-destructive">Aucune catégorie trouvée pour ce projet. Impossible de générer des critères IA.</div>
  }
  
  const fetcher = (url: string) => fetch(url).then(res => res.json())
  
  // Utiliser la nouvelle API de progression pour des informations détaillées
  const { data: progressData, error: progressError } = useSWR<ProgressData>(
    currentStatus === 'processing' || currentStatus === 'pending' ? `/api/projects/slug/${slug}/progress` : null,
    fetcher,
    {
      // Polling plus fréquent pendant le traitement pour un feedback en temps réel
      refreshInterval: currentStatus === 'processing' ? 1000 : currentStatus === 'pending' ? 3000 : 0,
      revalidateOnFocus: false
    }
  )

  // Fetch des critères seulement si done ou si on veut les voir en temps réel pendant processing
  const { data, error, isLoading } = useSWR<{ criteres: Critere[] }>(
    currentStatus === 'done' || currentStatus === 'processing' ? `/api/projects/slug/${slug}/criteres` : null,
    fetcher,
    {
      // Polling moins fréquent pour les critères (ils changent moins souvent)
      refreshInterval: currentStatus === 'processing' ? 3000 : 0,
      revalidateOnFocus: false
    }
  )

  // Mettre à jour le statut local quand le statut du projet change
  useEffect(() => {
    if (progressData?.enrichmentStatus && progressData.enrichmentStatus !== currentStatus) {
      setCurrentStatus(progressData.enrichmentStatus as EnrichmentStatus)
    }
  }, [progressData, currentStatus])

  // Debug : log des données reçues
  console.log('PROGRESS DATA', progressData, 'CRITERES DATA', data, 'STATUS', currentStatus)
  console.log('criteres.length', data?.criteres.length, 'progress.current', progressData?.progress.current, 'progress.total', progressData?.progress.total)

  // Alerte si incohérence entre la progression et les données reçues
  if ((progressData?.progress.current > 0 || progressData?.progress.total > 0) && data?.criteres.length === 0 && (currentStatus === 'done' || currentStatus === 'processing')) {
    return <div className="py-12 text-center text-destructive">Incohérence détectée : la progression indique {progressData?.progress.current}/{progressData?.progress.total} critères, mais aucune donnée n'a été reçue côté client.<br/>Vérifie la route API /api/projects/slug/{slug}/criteres et le mapping côté SWR.</div>
  }

  // Gestion d'erreur structurelle
  if (currentStatus === 'error') {
    return <div className="py-12 text-center text-destructive">Erreur lors de l'enrichissement IA. Veuillez réessayer ou contacter le support.</div>
  }

  if (currentStatus === 'done' && !isLoading && (!data || !Array.isArray(data.criteres))) {
    return <div className="py-12 text-center text-destructive">Erreur : Données IA manquantes ou mal structurées. Vérifie la génération côté backend/OpenAI.</div>
  }
  
  // Utiliser les métriques de la progression si disponibles, sinon calculer depuis les critères
  const criteres = data?.criteres || []
  const metrics = progressData?.metrics || {
    aiCriteria: criteres.length,
    withFacebook: criteres.filter(c => c.suggestions && c.suggestions.length > 0).length,
    valid: criteres.filter(c => c.status === 'valid').length
  }
  
  // Utiliser la progression détaillée de l'API
  const progress = progressData?.progress || {
    current: criteres.length,
    total: totalCategories,
    step: currentStatus === 'done' ? 'Terminé' : currentStatus === 'processing' ? 'Traitement en cours...' : 'En attente...',
    percentage: currentStatus === 'done' ? 100 : Math.round((criteres.length / totalCategories) * 100),
    errors: currentStatus === 'error' ? 1 : 0,
    eta: currentStatus === 'processing' ? 'Calcul en cours...' : '-'
  }

  // Mode onlyMetrics : retourner seulement les cards de métriques
  if (onlyMetrics) {
    return <ProjectResults onlyMetrics metrics={metrics} categoriesData={categoriesData} criteriaData={criteres} />
  }

  // Mode onlyProgress : retourner seulement la progression et tableau
  if (onlyProgress) {
    if (currentStatus === 'processing' || currentStatus === 'pending') {
      return <ProjectResults onlyProgress progress={progress} metrics={metrics} categoriesData={categoriesData} criteriaData={criteres} />
    }
    if (currentStatus === 'done') {
      if (isLoading) {
        return <div className="py-12 text-center text-muted-foreground">Chargement des critères...</div>
      }
      if (error) {
        return <div className="py-12 text-center text-destructive">Erreur lors du chargement des critères.</div>
      }
      if (criteres.length === 0) {
        return <div className="py-12 text-center text-destructive">Aucun critère généré par l'IA pour ce projet.</div>
      }
      return <ProjectResults isComplete criteriaData={criteres} progress={progress} onlyProgress categoriesData={categoriesData} />
    }
    // Fallback pour onlyProgress
    return <ProjectResults onlyProgress progress={progress} categoriesData={categoriesData} criteriaData={criteres} />
  }

  // Mode normal (complet)
  if (currentStatus === 'processing' || currentStatus === 'pending') {
    return (
      <ProjectResults progress={progress} metrics={metrics} categoriesData={categoriesData} criteriaData={criteres} />
    )
  }
  if (currentStatus === 'done') {
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
      <ProjectResults isComplete criteriaData={criteres} metrics={metrics} progress={progress} categoriesData={categoriesData} />
    )
  }
  
  // Statut par défaut (fallback)
  return (
    <ProjectResults progress={progress} metrics={metrics} categoriesData={categoriesData} criteriaData={criteres} />
  )
}

export default ProjectResultsClient 