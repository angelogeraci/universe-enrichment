'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import StatusTag from "./StatusTag"
import { Progress } from './ui/progress'
import { Skeleton } from './ui/skeleton'
import { Pagination } from './ui/pagination'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table'
import { 
  Select as SelectUI,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { Input } from "./ui/input"
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  RotateCcw,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Download,
  Trash2
} from 'lucide-react'
import * as XLSX from 'xlsx'
import Select from 'react-select'
import type { Row } from '@tanstack/react-table'
import { Checkbox } from './ui/checkbox'
import { useToast } from '@/hooks/useToast'

// Helper function to convert 0-1 scores back to 0-100% for display
function getDisplayScore(score: number): number {
  return score <= 1 ? score * 100 : score
}

type EnrichmentStatus = 'pending' | 'in_progress' | 'paused' | 'cancelled' | 'done' | 'failed'

interface InterestSuggestion {
  id: string
  label: string
  facebookId?: string // Ajout de l'ID Facebook
  audience: number
  similarityScore: number
  isBestMatch: boolean
  isSelectedByUser: boolean
}

interface Interest {
  id: string
  name: string
  country: string
  status: string
  suggestions: InterestSuggestion[]
}

interface ProgressData {
  enrichmentStatus: EnrichmentStatus
  progress: {
    current: number
    total: number
    currentInterestLabel?: string
    percentage: number
  }
  metrics: {
    totalInterests: number
    withSuggestions: number
    processed: number
  }
}

// Composant Skeleton pour le chargement
const PageSkeleton = () => (
  <div className="space-y-6">
    {/* Métriques skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
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
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      </div>
      <div className="p-4 space-y-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            {[...Array(5)].map((_, j) => (
              <Skeleton key={j} className="h-4 w-24" />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
)

interface InterestCheckResultsClientProps {
  slug: string
  enrichmentStatus: EnrichmentStatus | string
  totalInterests: number
  onlyMetrics?: boolean
  onlyProgress?: boolean
}

export function InterestCheckResultsClient({ 
  slug, 
  enrichmentStatus: initialStatusRaw, 
  totalInterests,
  onlyMetrics = false,
  onlyProgress = false 
}: InterestCheckResultsClientProps) {
  const { toast } = useToast()
  const initialStatus = (['pending','in_progress','paused','cancelled','done','failed'].includes(initialStatusRaw) ? initialStatusRaw : 'pending') as EnrichmentStatus
  const [currentStatus, setCurrentStatus] = useState<EnrichmentStatus>(initialStatus)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Filtres avancés
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [scoreRange, setScoreRange] = useState({ min: 0, max: 100 })
  const [audienceMin, setAudienceMin] = useState(0)
  const [filterNoSuggestion, setFilterNoSuggestion] = useState(false)
  const [filterBestMatch, setFilterBestMatch] = useState(false)
  const [filterUserSelected, setFilterUserSelected] = useState(false)
  const [relevanceThreshold, setRelevanceThreshold] = useState(60)
  const [relevanceFilter, setRelevanceFilter] = useState([
    { value: 'relevant', label: 'Pertinents' },
    { value: 'nonrelevant', label: 'Non pertinents' },
    { value: 'nosuggestion', label: 'Sans suggestion' },
  ])
  const relevanceOptions = [
    { value: 'relevant', label: 'Pertinents' },
    { value: 'nonrelevant', label: 'Non pertinents' },
    { value: 'nosuggestion', label: 'Sans suggestion' },
  ]

  const fetcher = (url: string) => fetch(url).then(res => res.json())

  // Fetch progress data
  const { data: progressData, error: progressError } = useSWR<ProgressData>(
    ['in_progress', 'pending', 'paused'].includes(currentStatus) ? `/api/interests-check/${slug}/progress` : null,
    fetcher,
    {
      refreshInterval: currentStatus === 'in_progress' ? 2000 : ['pending', 'paused'].includes(currentStatus) ? 5000 : 0,
      revalidateOnFocus: false
    }
  )

  // Fetch interests data
  const interestsKey = (['done', 'in_progress', 'paused', 'cancelled'].includes(currentStatus)) ? `/api/interests-check/${slug}/interests` : null
  const { data, error, isLoading, mutate: mutateInterests } = useSWR<{ interests: Interest[] }>(
    interestsKey,
    fetcher,
    {
      refreshInterval: currentStatus === 'in_progress' ? 5000 : 0,
      revalidateOnFocus: false
    }
  )

  // Update status when progress changes
  useEffect(() => {
    if (progressData?.enrichmentStatus && progressData.enrichmentStatus !== currentStatus) {
      setCurrentStatus(progressData.enrichmentStatus as EnrichmentStatus)
    }
  }, [progressData, currentStatus])

  // interests doit être défini avant le filtrage
  const interests: Interest[] = data?.interests || []

  // Control enrichment (start/pause/resume)
  const controlEnrichment = async (action: 'start' | 'pause' | 'resume') => {
    try {
      let response
      if (action === 'start') {
        response = await fetch('/api/interests-check/enrichment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug })
        })
      } else {
        response = await fetch(`/api/interests-check/${slug}/control`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        })
      }
      
      if (response.ok) {
        globalMutate(`/api/interests-check/${slug}/progress`)
        if (action === 'start') {
          setCurrentStatus('in_progress')
        }
      } else {
        const errorData = await response.json()
        alert(`Erreur: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Erreur contrôle enrichissement:', error)
      alert('Erreur lors du contrôle de l\'enrichissement')
    }
  }

  // Toggle suggestion selection
  const toggleSuggestionSelection = async (interestId: string, suggestionId: string) => {
    try {
      const response = await fetch(`/api/interests-check/${slug}/interests/${interestId}/suggestions/${suggestionId}/toggle`, {
        method: 'PUT'
      })
      
      if (response.ok) {
        mutateInterests()
      }
    } catch (error) {
      console.error('Erreur lors de la sélection:', error)
    }
  }

  // Sélectionner ou désélectionner un intérêt
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    )
  }
  // Sélectionner tout sur la page courante
  const toggleSelectAll = () => {
    const pageIds = paginatedInterests.map((i) => i.id)
    const allSelected = pageIds.every((id) => selectedIds.includes(id))
    setSelectedIds((prev) =>
      allSelected ? prev.filter((id) => !pageIds.includes(id)) : [...prev, ...pageIds.filter((id) => !prev.includes(id))]
    )
  }
  const { success, error: showError } = useToast()
  // Désélectionner tout
  const deselectAll = () => setSelectedIds([])
  
  // Suppression groupée avec feedback
  const deleteSelected = async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`Supprimer ${selectedIds.length} intérêts ?`)) return
    try {
      await Promise.all(selectedIds.map(async (id) => {
        await fetch(`/api/interests-check/${slug}/interests/${id}`, { method: 'DELETE' })
      }))
      setSelectedIds([])
      mutateInterests()
      toast(`${selectedIds.length} intérêt(s) supprimé(s)`, 'success')
    } catch (e) {
      toast('Erreur lors de la suppression', 'error')
    }
  }
  
  // Supprimer une ligne
  const deleteInterest = async (id: string) => {
    if (!window.confirm('Supprimer cet intérêt ?')) return
    await fetch(`/api/interests-check/${slug}/interests/${id}`, { method: 'DELETE' })
    setSelectedIds((prev) => prev.filter((sid) => sid !== id))
    mutateInterests()
  }

  // Relancer la recherche de suggestions pour un intérêt spécifique
  const retryInterestSuggestions = async (interestId: string) => {
    try {
      const response = await fetch(`/api/interests-check/${slug}/interests/${interestId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        toast(data.message || 'Recherche de suggestions relancée', 'success')
        
        // Actualiser les données immédiatement pour montrer le changement de statut
        mutateInterests()
        
        // Actualiser les données après un délai pour capturer les nouvelles suggestions
        setTimeout(() => {
          mutateInterests()
        }, 5000) // Délai de 5 secondes
        
        // Actualiser à nouveau après un délai plus long
        setTimeout(() => {
          mutateInterests()
        }, 15000) // Délai de 15 secondes
        
      } else {
        const errorData = await response.json()
        toast(errorData.error || 'Erreur lors de la relance', 'error')
      }
    } catch (error) {
      console.error('Erreur lors de la relance:', error)
      toast('Erreur de connexion', 'error')
    }
  }

  // Helper pour filtrer les vraies suggestions
  function getRealSuggestions(suggestions: InterestSuggestion[]) {
    return suggestions.filter(s => s.label && !s.label.startsWith('NO_SUGGESTIONS_') && s.audience > 0)
  }

  // Nouvelle logique de filtrage avancé
  const filteredInterests = interests.filter(interest => {
    const realSuggestions = getRealSuggestions(interest.suggestions || [])
    const hasSuggestions = realSuggestions.length > 0
    const mainSuggestion = hasSuggestions ? (realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]) : null
    const isRelevant = mainSuggestion && getDisplayScore(mainSuggestion.similarityScore) >= relevanceThreshold
    const showRelevant = relevanceFilter.some(opt => opt.value === 'relevant')
    const showNonRelevant = relevanceFilter.some(opt => opt.value === 'nonrelevant')
    const showNoSuggestion = relevanceFilter.some(opt => opt.value === 'nosuggestion')
    // Score min/max
    if (mainSuggestion) {
      const score = getDisplayScore(mainSuggestion.similarityScore)
      if (score < scoreRange.min || score > scoreRange.max) return false
    }
    // Audience min
    if (mainSuggestion && mainSuggestion.audience < audienceMin) return false
    // Best match
    if (filterBestMatch && !(mainSuggestion && mainSuggestion.isBestMatch)) return false
    // Sélection utilisateur
    if (filterUserSelected && !(mainSuggestion && mainSuggestion.isSelectedByUser)) return false
    // Aucune suggestion
    if (filterNoSuggestion && !hasSuggestions) return true
    if (filterNoSuggestion && hasSuggestions) return false
    if (showNoSuggestion && !hasSuggestions) return true
    if (!hasSuggestions) return false
    if (showRelevant && isRelevant) return true
    if (showNonRelevant && !isRelevant) return true
    return false
  }).filter(interest => {
    // Recherche texte
    return interest.name.toLowerCase().includes(searchQuery.toLowerCase()) && (statusFilter === 'all' || interest.status === statusFilter)
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredInterests.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedInterests = filteredInterests.slice(startIndex, endIndex)

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, showAdvancedFilters, scoreRange, audienceMin, filterNoSuggestion, filterBestMatch, filterUserSelected, relevanceFilter])

  // Calculate metrics
  const metrics = progressData?.metrics || {
    totalInterests: interests.length,
    withSuggestions: interests.filter(i => i.suggestions && i.suggestions.length > 0).length,
    processed: interests.filter(i => i.status === 'done').length
  }

  const progress = progressData?.progress || {
    current: metrics.processed,
    total: totalInterests,
    percentage: totalInterests > 0 ? (metrics.processed / totalInterests) * 100 : 0
  }

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>
      case 'in_progress':
        return <Badge variant="default"><Play className="h-3 w-3 mr-1" />En cours</Badge>
      case 'done':
        return <Badge className="bg-green-500 text-white border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Terminé</Badge>
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Échoué</Badge>
      case 'paused':
        return <Badge variant="outline"><Pause className="h-3 w-3 mr-1" />En pause</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Ajout de la fonction d'export XLSX
  const handleExportXLSX = () => {
    const header = [
      'Interest',
      'Country',
      'Status',
      'Selected Suggestion',
      'Selected Facebook ID',
      'Selected Audience',
      'Selected Score',
      'All Suggestions'
    ]
    const rows = filteredInterests.map(interest => {
      // Suggestion sélectionnée (par l'utilisateur ou best match)
      const selected = interest.suggestions.find(s => s.isSelectedByUser) || interest.suggestions.find(s => s.isBestMatch) || interest.suggestions[0]
      return [
        interest.name,
        interest.country,
        interest.status,
        selected ? selected.label : '',
        selected ? selected.facebookId || '' : '', // ID Facebook de la suggestion sélectionnée
        selected ? selected.audience : '',
        selected ? getDisplayScore(selected.similarityScore) : '',
        interest.suggestions.map(s => `${s.label} (ID: ${s.facebookId || 'N/A'}, ${s.audience}, ${Math.round(getDisplayScore(s.similarityScore))}%)${s.isBestMatch ? ' [Best]' : ''}${s.isSelectedByUser ? ' [Selected]' : ''}`).join('; ')
      ]
    })
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Export')
    XLSX.writeFile(wb, 'interest-check-export.xlsx')
  }

  // Harmonisation du rendu des suggestions dans la table
  const renderSuggestionCell = (suggestion: InterestSuggestion | null, interest: Interest) => {
    if (!suggestion) return <span className="text-muted-foreground italic">Aucune</span>
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{suggestion.label}</span>
          {suggestion.isBestMatch && (
            <Badge variant="outline" className="border-blue-500 text-blue-600">Best match</Badge>
          )}
          {suggestion.isSelectedByUser && (
            <Badge variant="outline" className="border-green-500 text-green-600">Sélection</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Score : <span className="font-semibold">{Math.round(getDisplayScore(suggestion.similarityScore))}</span></span>
          <span>Audience : <span className="font-semibold">{suggestion.audience?.toLocaleString() ?? '-'}</span></span>
        </div>
      </div>
    )
  }

  // Variables de sélection pour la checkbox d'en-tête
  const pageSelected = paginatedInterests.length > 0 && paginatedInterests.every(i => selectedIds.includes(i.id))
  const pageSome = paginatedInterests.some(i => selectedIds.includes(i.id))
  const isIndeterminate = pageSome && !pageSelected

  const [isRecalculating, setIsRecalculating] = useState(false)

  const recalculateSelectedScores = async () => {
    if (selectedIds.length === 0) return
    setIsRecalculating(true)
    try {
      const res = await fetch(`/api/interests-check/${slug}/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestIds: selectedIds })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast(`Score recalculé pour ${data.updatedCount} intérêt(s).`, 'success')
        if (data.errors && data.errors.length > 0) {
          toast(data.errors.join('\n'), 'info')
        }
        mutateInterests()
      } else {
        toast(data.error || 'Erreur lors du recalcul des scores.', 'error')
      }
    } catch (e) {
      toast('Une erreur est survenue lors du recalcul des scores.', 'error')
    } finally {
      setIsRecalculating(false)
    }
  }

  // Show skeleton during loading
  if (isLoading && currentStatus === 'done') {
    return <PageSkeleton />
  }

  // Only show metrics cards
  if (onlyMetrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Intérêts</CardDescription>
            <CardTitle className="text-2xl">{metrics.totalInterests}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Importés depuis le fichier Excel
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avec Suggestions</CardDescription>
            <CardTitle className="text-2xl">{metrics.withSuggestions}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Ont des suggestions Facebook
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Traités</CardDescription>
            <CardTitle className="text-2xl">{metrics.processed}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Enrichissement terminé
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Only show progress and table
  if (onlyProgress) {
    return (
      <div className="space-y-6 mt-6">
        {/* Progress and Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {currentStatus === 'pending' && (
              <Button onClick={() => controlEnrichment('start')} className="bg-blue-600 hover:bg-blue-700">
                <Play className="h-4 w-4 mr-2" />
                Lancer l'enrichissement
              </Button>
            )}
            
            {currentStatus === 'in_progress' && (
              <Button onClick={() => controlEnrichment('pause')} variant="outline">
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}
            
            {currentStatus === 'paused' && (
              <Button onClick={() => controlEnrichment('resume')} className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-2" />
                Reprendre
              </Button>
            )}

            {getStatusBadge(currentStatus)}
          </div>

          {(currentStatus === 'in_progress' || currentStatus === 'paused') && (
            <div className="text-right text-sm text-muted-foreground">
              {progress.current}/{progress.total} intérêts traités
              {progressData?.progress?.currentInterestLabel && (
                <div className="text-xs">
                  En cours: {progressData.progress.currentInterestLabel}
                </div>
              )}
            </div>
          )}
        </div>

        {(currentStatus === 'in_progress' || currentStatus === 'paused') && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progression de l'enrichissement</span>
              <span>{Math.round(progress.percentage)}%</span>
            </div>
            <Progress value={progress.percentage} className="w-full" />
          </div>
        )}

        {/* Filters and Search */}
        {currentStatus === 'done' && interests.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un intérêt..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <SelectUI value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="done">Terminé</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="failed">Échoué</SelectItem>
                </SelectContent>
              </SelectUI>
              <Button size="sm" variant={showAdvancedFilters ? "default" : "outline"} onClick={() => setShowAdvancedFilters(v => !v)}>
                <Filter className="h-4 w-4 mr-2" /> Filtres {showAdvancedFilters && <XCircle className="ml-1 h-4 w-4" />}
              </Button>
              {/* Bouton Export XLSX */}
              <Button size="sm" variant="default" onClick={handleExportXLSX}>
                <Download className="h-4 w-4 mr-2" />
                Exporter en XLSX
              </Button>
            </div>
            {showAdvancedFilters && (
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="text-sm font-medium mb-3 text-gray-700">Filtres avancés</h3>
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="text-xs text-gray-600">Pertinence</label>
                    <div style={{ minWidth: 220 }}>
                      <Select
                        isMulti
                        options={relevanceOptions}
                        value={relevanceFilter}
                        onChange={opts => setRelevanceFilter(opts as typeof relevanceFilter)}
                        closeMenuOnSelect={false}
                        hideSelectedOptions={false}
                        placeholder="Filtrer..."
                        classNamePrefix="relevance-select"
                        styles={{
                          control: (base: any) => ({ ...base, minHeight: 32, borderRadius: 6, fontSize: '14px' }),
                          menu: (base: any) => ({ ...base, zIndex: 50 }),
                          multiValue: (base: any) => ({ ...base, background: '#e0e7ff', color: '#1e40af' }),
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Score min</label>
                    <Input type="number" min={0} max={100} value={scoreRange.min} onChange={e => setScoreRange(r => ({ ...r, min: Number(e.target.value) }))} className="w-20" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Score max</label>
                    <Input type="number" min={0} max={100} value={scoreRange.max} onChange={e => setScoreRange(r => ({ ...r, max: Number(e.target.value) }))} className="w-20" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Audience min</label>
                    <Input type="number" min={0} value={audienceMin} onChange={e => setAudienceMin(Number(e.target.value))} className="w-24" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={filterNoSuggestion} onChange={e => setFilterNoSuggestion(e.target.checked)} />
                    <span className="text-xs">Aucune suggestion</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={filterBestMatch} onChange={e => setFilterBestMatch(e.target.checked)} />
                    <span className="text-xs">Best match</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={filterUserSelected} onChange={e => setFilterUserSelected(e.target.checked)} />
                    <span className="text-xs">Sélection utilisateur</span>
                  </div>
                </div>
              </div>
            )}

            {/* Results Table */}
            {selectedIds.length > 0 && (
              <div className="sticky top-0 z-10 bg-white border-b flex items-center gap-4 px-4 py-2 shadow-sm">
                <span>{selectedIds.length} sélectionné{selectedIds.length > 1 ? 's' : ''}</span>
                <Button variant="default" size="sm" onClick={recalculateSelectedScores} disabled={selectedIds.length === 0 || isRecalculating}>
                  {isRecalculating ? <RotateCcw className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />} Recalculer le score
                </Button>
                <Button variant="destructive" size="sm" onClick={deleteSelected} disabled={selectedIds.length === 0}>
                  <Trash2 className="h-4 w-4 mr-2" /> Supprimer la sélection
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Désélectionner tout
                </Button>
              </div>
            )}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Checkbox
                        checked={pageSelected}
                        data-state={isIndeterminate ? 'indeterminate' : pageSelected ? 'checked' : 'unchecked'}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Tout sélectionner"
                      />
                    </TableHead>
                    <TableHead>Intérêt</TableHead>
                    <TableHead>Pays</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Suggestions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInterests.map((interest) => (
                    <TableRow
                      key={interest.id}
                      className={selectedIds.includes(interest.id) ? 'bg-blue-50' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(interest.id)}
                          onCheckedChange={() => toggleSelect(interest.id)}
                          aria-label="Sélectionner l'intérêt"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{interest.name}</TableCell>
                      <TableCell>{interest.country}</TableCell>
                      <TableCell>{getStatusBadge(interest.status)}</TableCell>
                      <TableCell>
                        {interest.suggestions.length > 0 ? (
                          <div className="space-y-1">
                            {interest.suggestions.slice(0, 3).map((suggestion) => (
                              <div
                                key={suggestion.id}
                                className={`text-xs p-1 rounded cursor-pointer ${
                                  suggestion.isSelectedByUser
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : suggestion.isBestMatch
                                    ? 'bg-green-100 text-green-800 border border-green-300'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                                onClick={() => toggleSuggestionSelection(interest.id, suggestion.id)}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="truncate">{suggestion.label}</span>
                                  <div className="flex items-center gap-1 ml-2">
                                    <Users className="h-3 w-3" />
                                    <span>{suggestion.audience.toLocaleString()}</span>
                                    <span className="ml-1 text-xs">({Math.round(getDisplayScore(suggestion.similarityScore))}%)</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {interest.suggestions.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                +{interest.suggestions.length - 3} autres...
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Aucune suggestion</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => retryInterestSuggestions(interest.id)}
                            disabled={['in_progress', 'pending'].includes(currentStatus)}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Relancer
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteInterest(interest.id)}>
                            <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredInterests.length}
              pageSize={itemsPerPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setItemsPerPage(size)
                setCurrentPage(1) // Reset à la première page quand on change la taille
              }}
              canPreviousPage={currentPage > 1}
              canNextPage={currentPage < totalPages}
              pageSizeOptions={[10, 25, 50, 100]}
              showPageSize={true}
              showInfo={true}
            />
          </div>
        )}

        {currentStatus === 'done' && interests.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Aucun intérêt trouvé
          </div>
        )}
      </div>
    )
  }

  return null
} 