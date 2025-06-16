'use client'
import { useEffect, useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { ProjectResults, Critere } from './ProjectResults'
import { Skeleton } from './ui/skeleton'

type EnrichmentStatus = 'pending' | 'processing' | 'paused' | 'cancelled' | 'done' | 'error'

interface ProgressData {
  enrichmentStatus: EnrichmentStatus
  progress: {
    current: number
    total: number
    step: string
    percentage: number
    errors: number
    eta: string
    isPausedFacebook?: boolean
    currentCategoryIndex?: number
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
  pausedAt?: string
}

// Composant Skeleton pour le chargement de page
const PageSkeleton = () => (
  <div className="p-6 space-y-6">
    {/* Métriques skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-4 border rounded-lg">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      ))}
    </div>
    
    {/* Contrôles skeleton */}
    <div className="flex justify-between items-center">
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-4 w-40" />
    </div>
    
    {/* Tableau skeleton */}
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 p-3">
        <div className="flex justify-between">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      </div>
      <div className="p-4 space-y-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            {[...Array(7)].map((_, j) => (
              <Skeleton key={j} className="h-4 w-24" />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
)

export function ProjectResultsClient({ slug, enrichmentStatus: initialStatus, totalCategories, onlyMetrics = false, onlyProgress = false, categoriesData = [] }: { 
  slug: string, 
  enrichmentStatus: EnrichmentStatus, 
  totalCategories: number,
  onlyMetrics?: boolean,
  onlyProgress?: boolean,
  categoriesData?: Array<{ name: string, path: string[], andCriteria?: string[] }>
}) {
  const [currentStatus, setCurrentStatus] = useState<EnrichmentStatus>(initialStatus)
  const [relevanceThreshold, setRelevanceThreshold] = useState<number>(70)

  // Fonction pour contrôler le projet (pause/reprise/annulation)
  const controlProject = async (action: 'pause' | 'resume' | 'cancel') => {
    try {
      const response = await fetch(`/api/projects/slug/${slug}/control`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      
      if (response.ok) {
        // Rafraîchir les données
        globalMutate(`/api/projects/slug/${slug}/progress`)
      } else {
        const errorData = await response.json()
        alert(`Erreur: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Erreur contrôle projet:', error)
      alert('Erreur lors du contrôle du projet')
    }
  }

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data.facebookRelevanceScoreThreshold) {
          // Convertir le format décimal (0.7) en format pourcentage (70)
          const threshold = Number(data.facebookRelevanceScoreThreshold)
          setRelevanceThreshold(threshold <= 1 ? threshold * 100 : threshold)
        }
      })
      .catch(() => {})
  }, [])

  if (totalCategories === 0) {
    return <div className="py-12 text-center text-destructive">Aucune catégorie trouvée pour ce projet. Impossible de générer des critères IA.</div>
  }
  
  const fetcher = (url: string) => fetch(url).then(res => res.json())
  
  // Utiliser la nouvelle API de progression pour des informations détaillées
  const { data: progressData, error: progressError } = useSWR<ProgressData>(
    ['processing', 'pending', 'paused'].includes(currentStatus) ? `/api/projects/slug/${slug}/progress` : null,
    fetcher,
    {
      // Polling plus fréquent pendant le traitement pour un feedback en temps réel
      refreshInterval: currentStatus === 'processing' ? 1000 : ['pending', 'paused'].includes(currentStatus) ? 3000 : 0,
      revalidateOnFocus: false
    }
  )

  // Fetch des critères seulement si done ou si on veut les voir en temps réel pendant processing
  const criteresKey = (['done', 'processing', 'paused', 'cancelled'].includes(currentStatus)) ? `/api/projects/slug/${slug}/criteres` : null
  const { data, error, isLoading, mutate: mutateCriteres } = useSWR<{ criteres: Critere[] }>(
    criteresKey,
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
  if ((progressData?.progress?.current && progressData.progress.current > 0) || (progressData?.progress?.total && progressData.progress.total > 0)) {
    if ((!data || data.criteres.length === 0) && (['done', 'processing', 'paused'].includes(currentStatus))) {
      return <div className="py-12 text-center text-destructive">Incohérence détectée : la progression indique {progressData?.progress?.current}/{progressData?.progress?.total} critères, mais aucune donnée n'a été reçue côté client.<br/>Vérifie la route API /api/projects/slug/{slug}/criteres et le mapping côté SWR.</div>
    }
  }

  // Gestion d'erreur structurelle
  if (currentStatus === 'error') {
    return <div className="py-12 text-center text-destructive">Erreur lors de l'enrichissement IA. Veuillez réessayer ou contacter le support.</div>
  }

  // Afficher le skeleton pendant le chargement initial
  if (isLoading && currentStatus === 'done') {
    return <PageSkeleton />
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
    step: currentStatus === 'done' ? 'Terminé' : 
           currentStatus === 'paused' ? 'Mis en pause' :
           currentStatus === 'cancelled' ? 'Annulé' :
           currentStatus === 'processing' ? 'Traitement en cours...' : 
           (currentStatus as EnrichmentStatus) === 'error' ? 'Erreur' : 'En attente...',
    percentage: currentStatus === 'done' ? 100 : Math.round((criteres.length / totalCategories) * 100),
    errors: (currentStatus as EnrichmentStatus) === 'error' ? 1 : 0,
    eta: currentStatus === 'processing' ? 'Calcul en cours...' : '-'
  }

  // Si seuls les métriques doivent être affichées
  if (onlyMetrics) {
    return (
      <ProjectResults
        isComplete={currentStatus === 'done'}
        onlyMetrics={true}
        metrics={progressData?.metrics || { aiCriteria: 0, withFacebook: 0, valid: 0, totalCategories }}
        progress={progressData?.progress || { current: 0, total: 0, step: 'Starting...', errors: 0, eta: '-' }}
        criteriaData={data?.criteres || []}
        categoriesData={categoriesData}
        onDataChange={async () => {
          await mutateCriteres()
        }}
      />
    )
  }

  // Si seule la progression doit être affichée
  if (onlyProgress) {
    return (
      <ProjectResults
        isComplete={currentStatus === 'done'}
        onlyProgress={true}
        metrics={progressData?.metrics || { aiCriteria: 0, withFacebook: 0, valid: 0, totalCategories }}
        progress={progressData?.progress || { current: 0, total: 0, step: 'Starting...', errors: 0, eta: '-' }}
        criteriaData={data?.criteres || []}
        categoriesData={categoriesData}
        onDataChange={async () => {
          await mutateCriteres()
        }}
      />
    )
  }

  return (
    <ProjectResults
      isComplete={currentStatus === 'done'}
      metrics={progressData?.metrics || { aiCriteria: 0, withFacebook: 0, valid: 0, totalCategories }}
      progress={progressData?.progress || { current: 0, total: 0, step: 'Starting...', errors: 0, eta: '-' }}
      criteriaData={data?.criteres || []}
      categoriesData={categoriesData}
      onDataChange={async () => {
        await mutateCriteres()
      }}
    />
  )
}

export default ProjectResultsClient 