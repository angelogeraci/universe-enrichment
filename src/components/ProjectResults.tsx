'use client'

import React, { useMemo, useState, useRef, useEffect } from 'react'
import { flushSync } from 'react-dom'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'
import { Badge } from './ui/badge'
import { useToast } from '@/hooks/useToast'
import * as XLSX from 'xlsx'
import { RefreshCw, Edit, Trash2, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react'
import BulkActionModal from './BulkActionModal'
import EditCriteriaModal from './EditCriteriaModal'
import Select from 'react-select'
import { Skeleton } from './ui/skeleton'
import { Pagination } from './ui/pagination'

export type Critere = {
  id: string
  label: string
  category: string
  categoryPath: string[]
  country: string
  status: string
  note?: string
  suggestions: Array<{
    id: string
    label: string
    audience: number
    similarityScore: number
    isBestMatch: boolean
    isSelectedByUser: boolean
  }>
}

// Helper pour filtrer les vraies suggestions (exclure les marqueurs NO_SUGGESTIONS)
function getRealSuggestions(suggestions: Array<{
  id: string
  label: string
  audience: number
  similarityScore: number
  isBestMatch: boolean
  isSelectedByUser: boolean
}>) {
  return suggestions.filter(s => 
    !s.label.startsWith('NO_SUGGESTIONS_') && 
    s.audience > 0
  )
}

// Helper pour vérifier si un critère a de vraies suggestions
function hasRealSuggestions(critere: Critere) {
  if (!critere.suggestions || critere.suggestions.length === 0) return false
  const realSuggestions = getRealSuggestions(critere.suggestions)
  return realSuggestions.length > 0
}

// Helper pour formater les nombres d'audience
function formatAudience(audience: number): string {
  if (audience >= 1000000) {
    return `${(audience / 1000000).toFixed(1)}M`
  } else if (audience >= 1000) {
    return `${(audience / 1000).toFixed(0)}K`
  }
  return audience.toString()
}

// Fonction utilitaire pour rendre le path robuste
const getCategoryPathString = (cat: any) => {
  if (!cat?.path) return ''
  if (Array.isArray(cat.path)) return cat.path.join(' -- ')
  if (typeof cat.path === 'string') return cat.path
  return ''
}

// Composant séparé pour la barre de progression de mise à jour
function UpdateProgressBar({ 
  updateProgress, 
  currentlyProcessing, 
  selected, 
  criteriaData 
}: {
  updateProgress: { current: number, total: number }
  currentlyProcessing: string
  selected: string[]
  criteriaData: Critere[]
}) {
  const percentage = updateProgress.total > 0 ? Math.round((updateProgress.current / updateProgress.total) * 100) : 0
  return (
    <div className="w-full flex flex-col gap-8 mt-8">
      {/* Barre de progression principale harmonisée */}
      <div className="w-full flex flex-col gap-4 p-6 bg-white border border-gray-200 rounded-xl shadow-md">
        <div className="text-center">
          <h2 className="text-xl font-bold text-primary mb-2">Mise à jour des suggestions Facebook</h2>
          <p className="text-muted-foreground">Traitement en cours, veuillez patienter...</p>
        </div>
        <div className="w-full flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary">Progression</span>
            <span className="text-sm font-bold text-primary">{updateProgress.current}/{updateProgress.total} critères traités</span>
          </div>
          {/* Barre de progression custom avec animation */}
          <div className="relative h-4 w-full rounded-full bg-gray-200 overflow-hidden border border-gray-300">
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${percentage}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white drop-shadow-sm">
                {percentage}%
              </span>
            </div>
          </div>
          {/* Critère en cours de traitement */}
          {currentlyProcessing && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-sm text-primary">
                En cours : <span className="font-medium">{currentlyProcessing}</span>
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Traitement séquentiel pour un suivi précis</span>
            <span>
              {updateProgress.current > 0 && updateProgress.total > 0 && (
                `${Math.round((updateProgress.current / updateProgress.total) * 100)}% terminé`
              )}
            </span>
          </div>
        </div>
      </div>
      {/* Tableau de suivi détaillé harmonisé */}
      {criteriaData.length > 0 && (
        <div className="w-full">
          <h3 className="text-lg font-semibold mb-4 text-primary">Critères sélectionnés pour mise à jour :</h3>
          <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nom</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Catégorie</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody>
                {selected.map((critereId, index) => {
                  const critere = criteriaData.find(c => c.id === critereId)
                  if (!critere) return null
                  const isCompleted = index < updateProgress.current
                  const isProcessing = index === updateProgress.current && currentlyProcessing === critere.label
                  return (
                    <tr key={critere.id} className={`border-b last:border-b-0 ${
                      isCompleted ? 'bg-green-50' : 
                      isProcessing ? 'bg-blue-50' : 
                      'bg-gray-50'
                    }`}>
                      <td className="px-4 py-3 font-medium">{critere.label}</td>
                      <td className="px-4 py-3 text-muted-foreground">{critere.category}</td>
                      <td className="px-4 py-3">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Traité
                          </span>
                        ) : isProcessing ? (
                          <span className="inline-flex items-center gap-2 text-blue-700 font-medium">
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                            En cours...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            En attente
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// Composant Skeleton pour les lignes en loading
const CriteriaRowSkeleton = () => (
  <tr className="animate-pulse">
    <td className="px-2 py-2">
      <Skeleton className="w-4 h-4" />
    </td>
    <td className="px-2 py-2">
      <Skeleton className="h-4 w-3/4" />
    </td>
    <td className="px-2 py-2">
      <Skeleton className="h-4 w-1/2" />
    </td>
    <td className="px-2 py-2">
      <Skeleton className="h-4 w-20" />
    </td>
    <td className="px-2 py-2">
      <Skeleton className="h-4 w-16" />
    </td>
    <td className="px-2 py-2">
      <Skeleton className="h-4 w-12" />
    </td>
    <td className="px-2 py-2">
      <div className="flex gap-2">
        <Skeleton className="w-8 h-8" />
        <Skeleton className="w-8 h-8" />
        <Skeleton className="w-8 h-8" />
      </div>
    </td>
  </tr>
)

// Fonction pour convertir le score de la DB (0-1) vers l'affichage (0-100%)
function getDisplayScore(score: number): number {
  return score <= 1 ? score * 100 : score;
}

export function ProjectResults ({
  isComplete = false,
  metrics = {
    aiCriteria: 0,
    withFacebook: 0,
    valid: 0,
    totalCategories: undefined
  },
  progress = {
    current: 0,
    total: 0,
    step: 'Starting...',
    errors: 0,
    eta: '-'
  },
  onlyMetrics = false,
  onlyProgress = false,
  criteriaData = [],
  categoriesData = [],
  relevanceThreshold = 60,
  onDataChange = () => {},
  ...props
}: {
  isComplete?: boolean
  metrics?: { aiCriteria: number, withFacebook: number, valid: number, totalCategories?: number }
  progress?: { current: number, total: number, step: string, errors: number, eta: string }
  onlyMetrics?: boolean
  onlyProgress?: boolean
  criteriaData?: Critere[]
  categoriesData?: Array<{ name: string, path: string[], andCriteria?: string[] }>
  relevanceThreshold?: number
  onDataChange?: () => void
  [key: string]: any
}) {
  const { success, error, info } = useToast()
  
  // États pour la gestion du tableau
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'label' | 'category' | 'status' | 'audience' | 'relevance'>('label')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [loadingFacebook, setLoadingFacebook] = useState<Record<string, boolean>>({})
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [resultsPerPage, setResultsPerPage] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0 })
  const [currentlyProcessing, setCurrentlyProcessing] = useState<string>('')
  const [updateKey, setUpdateKey] = useState(0)
  const [loadingIndividualUpdate, setLoadingIndividualUpdate] = useState<Set<string>>(new Set())
  const [loadingCriteria, setLoadingCriteria] = useState<Set<string>>(new Set())
  const [isRecalculating, setIsRecalculating] = useState(false)
  
  // États pour les filtres avancés
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [scoreRange, setScoreRange] = useState({ min: 0, max: 100 })
  const [relevanceFilter, setRelevanceFilter] = useState([
    { value: 'relevant', label: 'Pertinents' },
    { value: 'nonrelevant', label: 'Non pertinents' },
    { value: 'nosuggestion', label: 'Sans suggestion' },
  ])

  // Debug: Log des changements d'état
  useEffect(() => {
    console.log('🔄 STATE CHANGE - isUpdating:', isUpdating)
  }, [isUpdating])

  useEffect(() => {
    console.log('📊 STATE CHANGE - updateProgress:', updateProgress)
  }, [updateProgress])

  useEffect(() => {
    console.log('🎯 STATE CHANGE - currentlyProcessing:', currentlyProcessing)
  }, [currentlyProcessing])

  useEffect(() => {
    console.log('🔑 STATE CHANGE - updateKey:', updateKey)
  }, [updateKey])

  // Options du filtre pertinence
  const relevanceOptions = [
    { value: 'relevant', label: 'Pertinents' },
    { value: 'nonrelevant', label: 'Non pertinents' },
    { value: 'nosuggestion', label: 'Sans suggestion' },
  ]

  // Ajout de l'option 1000 résultats par page
  const resultsPerPageOptions = [25, 50, 100, 200, 500, 1000]

  // Fonction pour sélectionner une suggestion spécifique
  const handleSelectSuggestion = async (critereId: string, suggestionId: string) => {
    try {
      const response = await fetch(`/api/facebook/suggestions/${critereId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ suggestionId })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la sélection de la suggestion')
      }

      success('Suggestion sélectionnée avec succès')
      // Rafraîchir les données via SWR
      onDataChange()
    } catch (error: any) {
      console.error('❌ Erreur sélection suggestion:', error)
      error(error.message || 'Erreur lors de la sélection')
    }
  }

  // Fonction pour basculer l'état du dropdown
  const toggleDropdown = (critereId: string) => {
    setDropdownOpen(prev => prev === critereId ? null : critereId)
  }

  // Récupérer les suggestions Facebook pour un critère
  const handleGetFacebookSuggestions = async (critere: Critere) => {
    setLoadingFacebook(prev => ({ ...prev, [critere.id]: true }))
    setIsUpdating(true)
    try {
      console.log(`🔍 Récupération suggestions Facebook pour: "${critere.label}"`)
      
      const response = await fetch('/api/facebook/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          critereId: critere.id,
          query: critere.label,
          country: critere.country
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la récupération des suggestions')
      }
      
      const data = await response.json()
      success(`${data.suggestions.length} suggestions récupérées pour "${critere.label}"`, { duration: 3000 })
      
      // Rafraîchir les données via SWR
      onDataChange()
      
    } catch (error: any) {
      console.error('❌ Erreur suggestions Facebook:', error)
      error(error.message || 'Erreur lors de la récupération des suggestions Facebook', { duration: 5000 })
    } finally {
      setLoadingFacebook(prev => ({ ...prev, [critere.id]: false }))
      setIsUpdating(false)
    }
  }

  // Update individuel d'un critère avec skeleton
  const handleIndividualUpdate = async (critere: Critere) => {
    try {
      // Ajouter le critère aux critères en loading
      setLoadingIndividualUpdate(prev => new Set([...prev, critere.id]))
      
      console.log(`🔄 Update individuel pour: "${critere.label}"`)
      
      const response = await fetch('/api/facebook/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          critereId: critere.id,
          query: critere.label,
          country: critere.country
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la récupération des suggestions')
      }
      
      const data = await response.json()
      success(`${data.suggestions.length} suggestions récupérées pour "${critere.label}"`, { duration: 3000 })
      
      // Rafraîchir les données via SWR
      onDataChange()
      
    } catch (error: any) {
      console.error('❌ Erreur update individuel:', error)
      error(error.message || 'Erreur lors de la récupération des suggestions Facebook', { duration: 5000 })
    } finally {
      // Retirer le critère des critères en loading
      setLoadingIndividualUpdate(prev => {
        const newSet = new Set(prev)
        newSet.delete(critere.id)
        return newSet
      })
    }
  }

  // Suppression individuelle d'un critère avec loader
  const handleDeleteCritere = async (critereId: string) => {
    try {
      // Ajouter le critère aux critères en loading
      setLoadingCriteria(prev => new Set([...prev, critereId]))
      
      const response = await fetch(`/api/criteres/${critereId}`, { 
        method: 'DELETE' 
      })
      
      if (response.ok) {
        success('Critère supprimé avec succès')
        
        // Utiliser la callback pour mettre à jour les données parent au lieu de recharger la page
        onDataChange()
      } else {
        error('Erreur lors de la suppression du critère')
      }
    } catch (e) {
      error('Erreur lors de la suppression')
    } finally {
      // Retirer le critère des critères en loading
      setLoadingCriteria(prev => {
        const newSet = new Set(prev)
        newSet.delete(critereId)
        return newSet
      })
    }
  }

  // Filtrage et tri
  const filtered = useMemo(() => {
    let data = criteriaData
    // Filtrage par pertinence multi-select + sans suggestion
    data = data.filter(critere => {
      const hasSuggestions = hasRealSuggestions(critere)
      const realSuggestions = getRealSuggestions(critere.suggestions || [])
      const mainSuggestion = hasSuggestions ? (realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]) : null
      const isRelevant = mainSuggestion && getDisplayScore(mainSuggestion.similarityScore) >= relevanceThreshold
      const showRelevant = relevanceFilter.some(opt => opt.value === 'relevant')
      const showNonRelevant = relevanceFilter.some(opt => opt.value === 'nonrelevant')
      const showNoSuggestion = relevanceFilter.some(opt => opt.value === 'nosuggestion')
      
      // Filtre par intervalle de score
      if (mainSuggestion) {
        const score = getDisplayScore(mainSuggestion.similarityScore)
        if (score < scoreRange.min || score > scoreRange.max) {
          return false
        }
      }
      
      if (showNoSuggestion && !hasSuggestions) return true
      if (!hasSuggestions) return false
      if (showRelevant && isRelevant) return true
      if (showNonRelevant && !isRelevant) return true
      return false
    })
    if (search) {
      data = data.filter(c => c.label.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase()))
    }
    data = [...data].sort((a, b) => {
      let vA, vB
      
      if (sortBy === 'audience') {
        // Pour l'audience, récupérer l'audience de la meilleure suggestion
        const suggA = getRealSuggestions(a.suggestions || []).find(s => s.isSelectedByUser) || 
                     getRealSuggestions(a.suggestions || []).find(s => s.isBestMatch) || 
                     getRealSuggestions(a.suggestions || [])[0]
        const suggB = getRealSuggestions(b.suggestions || []).find(s => s.isSelectedByUser) || 
                     getRealSuggestions(b.suggestions || []).find(s => s.isBestMatch) || 
                     getRealSuggestions(b.suggestions || [])[0]
        vA = suggA ? suggA.audience : 0
        vB = suggB ? suggB.audience : 0
      } else if (sortBy === 'relevance') {
        // Pour la relevance, récupérer le score de similarité de la meilleure suggestion
        const suggA = getRealSuggestions(a.suggestions || []).find(s => s.isSelectedByUser) || 
                     getRealSuggestions(a.suggestions || []).find(s => s.isBestMatch) || 
                     getRealSuggestions(a.suggestions || [])[0]
        const suggB = getRealSuggestions(b.suggestions || []).find(s => s.isSelectedByUser) || 
                     getRealSuggestions(b.suggestions || []).find(s => s.isBestMatch) || 
                     getRealSuggestions(b.suggestions || [])[0]
        vA = suggA ? getDisplayScore(suggA.similarityScore) : 0
        vB = suggB ? getDisplayScore(suggB.similarityScore) : 0
      } else {
        // Pour les autres colonnes (label, category, status)
        vA = a[sortBy as keyof Critere] || ''
        vB = b[sortBy as keyof Critere] || ''
      }
      
      if (typeof vA === 'number' && typeof vB === 'number') {
        return sortDir === 'asc' ? vA - vB : vB - vA
      } else {
        const strA = String(vA).toLowerCase()
        const strB = String(vB).toLowerCase()
        if (strA < strB) return sortDir === 'asc' ? -1 : 1
        if (strA > strB) return sortDir === 'asc' ? 1 : -1
        return 0
      }
    })
    return data
  }, [criteriaData, search, sortBy, sortDir, relevanceFilter, scoreRange])

  const toggleSelect = (id: string) => {
    setSelected(sel => sel.includes(id) ? sel.filter(s => s !== id) : [...sel, id])
  }

  // Pagination helpers
  const totalResults = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalResults / resultsPerPage))
  const paginated = filtered.slice((currentPage - 1) * resultsPerPage, currentPage * resultsPerPage)

  // Sélectionner tous les critères de la page courante
  const selectAll = () => setSelected(sel => Array.from(new Set([...sel, ...paginated.map(c => c.id)])))
  const deselectAll = () => setSelected(sel => sel.filter(id => !paginated.some(c => c.id === id)))

  // Ref pour la checkbox "select all" (Radix UI = bouton)
  const selectAllRef = useRef<HTMLButtonElement>(null)

  // Gestion état indeterminé de la checkbox "select all"
  useEffect(() => {
    if (selectAllRef.current) {
      const pageSelected = paginated.every(c => selected.includes(c.id))
      const pageSome = paginated.some(c => selected.includes(c.id))
      const isIndeterminate = pageSome && !pageSelected
      selectAllRef.current.setAttribute('data-state', isIndeterminate ? 'indeterminate' : pageSelected ? 'checked' : 'unchecked')
    }
  }, [selected, paginated])

  // Fermer les dropdowns quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.relative')) {
        setDropdownOpen(null)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    // Reset page si filtre ou nombre de résultats change
    setCurrentPage(1)
  }, [resultsPerPage, search, sortBy, sortDir, relevanceFilter, scoreRange])

  // Fonction d'export XLSX
  const handleExportXLSX = () => {
    const header = [
      'Path',
      'Name',
      'Category',
      'Exclusion',
      'Level 1',
      'Level 2',
    ]
    const rows = filtered.flatMap(critere => {
      if (!critere.suggestions || critere.suggestions.length === 0) return []
      // Prendre la suggestion sélectionnée, sinon best match, sinon la première
      const selected = critere.suggestions.find(s => s.isSelectedByUser) || critere.suggestions.find(s => s.isBestMatch) || critere.suggestions[0]
      // Trouver la catégorie correspondante
      const cat = categoriesData?.find(cat => {
        // On compare le path complet (string ou array)
        const criterePath = Array.isArray(critere.categoryPath) ? critere.categoryPath.join(' -- ') : critere.categoryPath
        const catPath = getCategoryPathString(cat)
        return criterePath === catPath
      })
      // Path complet = path catégorie + suggestion
      const path = getCategoryPathString(cat) + (selected ? ' -- ' + selected.label : '')
      // Level 2 = andCriteria (array ou string)
      let level2 = ''
      if (cat?.andCriteria) {
        if (Array.isArray(cat.andCriteria)) level2 = cat.andCriteria.join(', ')
        else if (typeof cat.andCriteria === 'string') level2 = cat.andCriteria
      }
      return [[
        path,
        selected.label,
        critere.category,
        '',
        selected.label,
        level2
      ]]
    })
    console.log('Export XLSX - lignes exportées:', rows.length)
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Export')
    XLSX.writeFile(wb, 'export-suggestions.xlsx')
  }

  // Calcul dynamique des métriques à partir de criteriaData
  const aiCriteriaCount = criteriaData.length
  const withFacebookCount = criteriaData.filter(c => hasRealSuggestions(c)).length
  const validCriteriaCount = useMemo(() => {
    return criteriaData.filter(critere => {
      const realSuggestions = getRealSuggestions(critere.suggestions || [])
      const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
      return mainSuggestion && getDisplayScore(mainSuggestion.similarityScore) >= relevanceThreshold
    }).length
  }, [criteriaData, relevanceThreshold])

  // PRIORITÉ ABSOLUE : Affichage barre de progression update (avant toutes les autres conditions)
  if (isUpdating) {
    console.log('🎯 RENDU BARRE PROGRESSION UPDATE - isUpdating:', isUpdating, 'updateProgress:', updateProgress, 'currentlyProcessing:', currentlyProcessing)
    
    return (
      <UpdateProgressBar
        key={updateKey}
        updateProgress={updateProgress}
        currentlyProcessing={currentlyProcessing}
        selected={selected}
        criteriaData={criteriaData}
      />
    )
  }

  // Suppression en masse des critères sélectionnés
  const handleDeleteSelected = async () => {
    if (selected.length === 0) return
    try {
      const results = await Promise.all(selected.map(id =>
        fetch(`/api/criteres/${id}`, { method: 'DELETE' })
      ))
      const allOk = results.every(r => r.ok)
      if (allOk) {
        success(`${selected.length} critère(s) supprimé(s)`)
        // Remettre à zéro la sélection après suppression
        setSelected([])
      } else {
        error('Erreur lors de la suppression de certains critères')
      }
      onDataChange()
    } catch (e) {
      error('Erreur lors de la suppression')
    }
  }

  // Relancer le check de suggestion pour la sélection
  const handleUpdateSelected = async () => {
    console.log('🚀 DÉBUT handleUpdateSelected - selected.length:', selected.length)
    
    if (selected.length === 0) {
      console.log('❌ Aucun critère sélectionné, arrêt')
      return
    }
    
    console.log('🚀 DÉBUT MISE À JOUR - Critères sélectionnés:', selected.length)
    console.log('🔄 Mise à jour isUpdating à true avec flushSync...')
    
    // Utiliser flushSync pour forcer le re-render immédiat
    flushSync(() => {
      setIsUpdating(true)
      setUpdateProgress({ current: 0, total: selected.length })
      setCurrentlyProcessing('')
      setUpdateKey(prevKey => prevKey + 1)
    })
    
    console.log('✅ États mis à jour avec flushSync, début du traitement...')
    
    try {
      // Traiter les critères un par un pour un suivi précis du progrès
      for (let i = 0; i < selected.length; i++) {
        const id = selected[i]
        
        // Trouver le critère correspondant pour récupérer ses données
        const critere = criteriaData.find(c => c.id === id)
        if (!critere) {
          console.error(`Critère non trouvé pour l'ID: ${id}`)
          continue
        }
        
        console.log(`📊 PROGRÈS: ${i + 1}/${selected.length} - Traitement: ${critere.label}`)
        
        // Mettre à jour le progrès AVANT de commencer le traitement avec flushSync
        console.log(`🔄 Mise à jour progrès avec flushSync: current=${i}, total=${selected.length}`)
        flushSync(() => {
          setUpdateProgress({ current: i, total: selected.length })
          setCurrentlyProcessing(critere.label)
          setUpdateKey(prevKey => prevKey + 1)
        })
        
        try {
          console.log(`🔄 Traitement ${i + 1}/${selected.length}: ${critere.label}`)
          
          const response = await fetch('/api/facebook/suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              critereId: id,
              query: critere.label,
              country: critere.country
            })
          })
          
          if (response.ok) {
            console.log(`✅ Succès ${i + 1}/${selected.length}: ${critere.label}`)
          } else {
            console.log(`❌ Erreur ${i + 1}/${selected.length}: ${critere.label}`)
          }
          
        } catch (error) {
          console.error(`❌ Exception pour le critère ${critere.label}:`, error)
        }
        
        // Mettre à jour le progrès APRÈS le traitement avec flushSync
        console.log(`📊 MISE À JOUR PROGRÈS avec flushSync: ${i + 1}/${selected.length}`)
        flushSync(() => {
          setUpdateProgress({ current: i + 1, total: selected.length })
          setUpdateKey(prevKey => prevKey + 1)
        })
        
        // Petite pause entre les requêtes pour éviter de surcharger l'API et permettre le re-render
        if (i < selected.length - 1) {
          console.log('⏳ Pause 300ms entre les requêtes...')
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }
      
      console.log('🎉 MISE À JOUR TERMINÉE')
      success(`${selected.length} critère(s) mis à jour`)
      
      // Remettre à zéro la sélection après mise à jour
      setSelected([])
      
      // Attendre un peu avant de recharger pour que l'utilisateur voie la completion
      console.log('⏳ Attente 1000ms avant reload...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Rafraîchir les données via SWR
      console.log('🔄 Rafraîchissement des données...')
      onDataChange()
      
    } catch (e) {
      console.error('❌ ERREUR GLOBALE:', e)
      error('Erreur lors de la mise à jour')
    } finally {
      console.log('🏁 NETTOYAGE FINAL - Remise à zéro des états avec flushSync...')
      flushSync(() => {
        setIsUpdating(false)
        setUpdateProgress({ current: 0, total: 0 })
        setCurrentlyProcessing('')
      })
    }
  }

  // Fonction pour recalculer le score des critères sélectionnés
  const recalculateSelectedScores = async () => {
    setIsRecalculating(true)
    try {
      const res = await fetch('/api/facebook/suggestions/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ critereIds: selected })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        success(`Score recalculé pour ${data.updatedCount} critère(s).`)
        if (data.errors && data.errors.length > 0) {
          info(data.errors.join('\n'))
        }
      } else {
        error(data.error || 'Erreur lors du recalcul des scores.')
      }
      // Rafraîchir les données du tableau si besoin
      onDataChange()
    } catch (e) {
      error('Une erreur est survenue lors du recalcul des scores.')
    } finally {
      setIsRecalculating(false)
    }
  }

  // Si onlyMetrics, afficher seulement les cards
  if (onlyMetrics) {
    return (
      <div className="w-full max-w-none space-y-4">
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-none items-stretch h-[220px] min-h-[220px]">
          <Card className="flex-1 min-w-0 w-full max-w-none shadow-md border-2 flex flex-col h-[220px] min-h-[220px] justify-between">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">AI criteria</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 justify-end items-center p-0 m-0">
              <div className="text-4xl font-bold text-primary">{aiCriteriaCount}</div>
              <div className="text-muted-foreground text-sm whitespace-nowrap">Proposed by AI</div>
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-0 w-full max-w-none shadow-md border-2 flex flex-col h-[220px] min-h-[220px] justify-between">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">With Facebook suggestion</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 justify-end items-center p-0 m-0">
              <div className="text-4xl font-bold text-primary">{withFacebookCount}</div>
              <div className="text-muted-foreground text-sm whitespace-nowrap">Found suggestions</div>
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-0 w-full max-w-none shadow-md border-2 flex flex-col h-[220px] min-h-[220px] justify-between">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Valid criteria</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 justify-end items-center p-0 m-0">
              <div className="text-4xl font-bold text-primary">{validCriteriaCount}</div>
              <div className="text-muted-foreground text-sm whitespace-nowrap">Score {'\u2265'} {relevanceThreshold}</div>
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-0 w-full max-w-none shadow-md border-2 flex flex-col h-[220px] min-h-[220px] justify-between">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Total categories</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 justify-end items-center p-0 m-0">
              <div className="text-4xl font-bold text-primary">{metrics.totalCategories ?? 0}</div>
              <div className="text-muted-foreground text-sm whitespace-nowrap">Categories in project</div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Mode spécial onlyProgress pour affichage séparé
  if (onlyProgress) {
    return (
      <div className="w-full flex flex-col gap-8 mt-8">
        {/* Barre de progression - uniquement si le projet n'est pas terminé */}
        {!isComplete && (
          <div className="w-full flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-muted-foreground">Progression</span>
              <span className="text-xs text-muted-foreground">{progress.current}/{progress.total} criteria</span>
            </div>
            <Progress value={progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0} />
            <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
              <span>Step: {progress.step}</span>
              <span>Errors: {progress.errors} | ETA: {progress.eta}</span>
            </div>
          </div>
        )}

        {/* Message d'attente si pas de critères */}
        {criteriaData.length === 0 && (
          <div className="w-full text-center text-muted-foreground py-12">
            <span>Results will be displayed once criteria are generated.</span>
          </div>
        )}

        {/* Tableau des critères - affiché dès qu'il y a des critères */}
        {criteriaData.length > 0 && (
          <div className="w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Input
                  type="text"
                  placeholder="Rechercher par nom ou catégorie..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-64"
                />
                <Button 
                  size="sm" 
                  variant={showAdvancedFilters ? "default" : "outline"}
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <Filter size={16} className="mr-2" />
                  Filtres {showAdvancedFilters && <X size={14} className="ml-1" />}
                </Button>
                <Button size="sm" variant="default" onClick={handleExportXLSX}>
                  Exporter en XLSX
                </Button>
                {selected.length > 0 && (
                  <div className="flex gap-2 items-center mb-2">
                    <BulkActionModal
                      action="update"
                      selectedCount={selected.length}
                      onConfirm={handleUpdateSelected}
                      isLoading={isUpdating}
                    >
                      <Button size="sm" variant="secondary" disabled={isUpdating}>
                        <RefreshCw size={16} className="mr-2" /> Update ({selected.length})
                      </Button>
                    </BulkActionModal>
                    <Button size="sm" variant="default" disabled={isRecalculating} onClick={recalculateSelectedScores}>
                      {isRecalculating ? (
                        <span className="flex items-center"><RefreshCw size={16} className="mr-2 animate-spin" />Recalcul en cours…</span>
                      ) : (
                        <span className="flex items-center"><RefreshCw size={16} className="mr-2" />Recalculer le score</span>
                      )}
                    </Button>
                    <BulkActionModal
                      action="delete"
                      selectedCount={selected.length}
                      onConfirm={handleDeleteSelected}
                    >
                      <Button size="sm" variant="destructive">
                        <Trash2 size={16} className="mr-2" /> Supprimer ({selected.length})
                      </Button>
                    </BulkActionModal>
                  </div>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {selected.length > 0 && `${selected.length} selected • `}{filtered.length} criteria
              </div>
            </div>

            {/* Panneau de filtres avancés */}
            {showAdvancedFilters && (
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="text-sm font-medium mb-3 text-gray-700">Filtres avancés</h3>
                <div className="space-y-4">
                  {/* Filtre par pertinence */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm text-gray-600 min-w-[80px]">Pertinence :</label>
                    <div style={{ minWidth: 280 }}>
                      <Select
                        isMulti
                        options={relevanceFilter}
                        value={relevanceFilter}
                        onChange={opts => setRelevanceFilter(opts as typeof relevanceFilter)}
                        closeMenuOnSelect={false}
                        hideSelectedOptions={false}
                        placeholder="Sélectionner les types..."
                        classNamePrefix="relevance-select"
                        styles={{
                          control: base => ({ ...base, minHeight: 32, borderRadius: 6, fontSize: '14px' }),
                          menu: base => ({ ...base, zIndex: 50 }),
                          multiValue: base => ({ ...base, background: '#e0e7ff', color: '#1e40af' }),
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Filtre par intervalle de score */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm text-gray-600 min-w-[80px]">Score :</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={scoreRange.min}
                        onChange={(e) => setScoreRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                        className="w-20 h-8 text-sm"
                        placeholder="Min"
                      />
                      <span className="text-sm text-gray-500">à</span>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={scoreRange.max}
                        onChange={(e) => setScoreRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                        className="w-20 h-8 text-sm"
                        placeholder="Max"
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setScoreRange({ min: 0, max: 100 })}
                        className="h-8 text-xs"
                      >
                        Reset
                      </Button>
                      <div className="text-xs text-gray-500">
                        ({scoreRange.min}% - {scoreRange.max}%)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-2 py-3 text-left w-[50px]">
                      <Checkbox ref={selectAllRef} checked={paginated.every(c => selected.includes(c.id))} onCheckedChange={checked => checked ? selectAll() : deselectAll()} />
                    </th>
                    <th className="px-2 py-3 text-left cursor-pointer hover:bg-muted/70" onClick={() => { setSortBy('label'); setSortDir(sortBy === 'label' && sortDir === 'asc' ? 'desc' : 'asc') }}>
                      Nom {sortBy === 'label' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-2 py-3 text-left cursor-pointer hover:bg-muted/70" onClick={() => { setSortBy('category'); setSortDir(sortBy === 'category' && sortDir === 'asc' ? 'desc' : 'asc') }}>
                      Catégorie {sortBy === 'category' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-2 py-3 text-left">Suggestion Facebook</th>
                    <th className="px-2 py-3 text-left cursor-pointer hover:bg-muted/70" onClick={() => { setSortBy('relevance'); setSortDir(sortBy === 'relevance' && sortDir === 'asc' ? 'desc' : 'asc') }}>
                      Score {sortBy === 'relevance' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-2 py-3 text-left cursor-pointer hover:bg-muted/70" onClick={() => { setSortBy('audience'); setSortDir(sortBy === 'audience' && sortDir === 'asc' ? 'desc' : 'asc') }}>
                      Audience {sortBy === 'audience' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-2 py-3 text-left">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginated.map(critere => {
                    // Si le critère est en loading pour update individuel ou suppression, afficher le skeleton
                    if (loadingIndividualUpdate.has(critere.id) || loadingCriteria.has(critere.id)) {
                      return <CriteriaRowSkeleton key={critere.id} />
                    }

                    return (
                    <tr key={critere.id} className={`${selected.includes(critere.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-2 py-2"><Checkbox checked={selected.includes(critere.id)} onCheckedChange={() => toggleSelect(critere.id)} /></td>
                      <td className="px-2 py-2 font-medium">{critere.label}</td>
                      <td className="px-2 py-2">{critere.category}</td>
                      
                      {/* Colonne Suggestion Facebook avec dropdown */}
                      <td className="px-2 py-2">
                        {hasRealSuggestions(critere) ? (
                          <div className="relative">
                            {/* Suggestion principale affichée */}
                            <div 
                              className={(() => {
                                const realSuggestions = getRealSuggestions(critere.suggestions || [])
                                const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                                if (!mainSuggestion) return 'p-2 rounded border bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed'
                                const displayScore = getDisplayScore(mainSuggestion.similarityScore)
                                if (displayScore < relevanceThreshold) {
                                  return 'p-2 rounded border bg-red-50 border-red-300 text-red-600 cursor-pointer hover:bg-red-100 transition-colors'
                                }
                                // Score >= seuil : vert si Best, bleu si Selected, gris sinon
                                if (mainSuggestion.isSelectedByUser) {
                                  return 'p-2 rounded border bg-blue-100 border-blue-300 text-blue-900 cursor-pointer hover:bg-opacity-80 transition-colors'
                                }
                                if (mainSuggestion.isBestMatch) {
                                  return 'p-2 rounded border bg-green-100 border-green-300 text-green-900 cursor-pointer hover:bg-opacity-80 transition-colors'
                                }
                                return 'p-2 rounded border bg-gray-100 border-gray-300 text-gray-900 cursor-pointer hover:bg-opacity-80 transition-colors'
                              })()}
                              onClick={() => {
                                const realSuggestions = getRealSuggestions(critere.suggestions || [])
                                const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                                if (!mainSuggestion) return
                                toggleDropdown(critere.id)
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm truncate max-w-[200px]">
                                  {(() => {
                                    const realSuggestions = getRealSuggestions(critere.suggestions || [])
                                    const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                                    return mainSuggestion?.label
                                  })()}
                                  {/* Point rouge si score < seuil */}
                                  {(() => {
                                    const realSuggestions = getRealSuggestions(critere.suggestions || [])
                                    const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                                    if (mainSuggestion && getDisplayScore(mainSuggestion.similarityScore) < relevanceThreshold) {
                                      return null
                                    }
                                    return null
                                  })()}
                                </span>
                                <div className="flex items-center gap-1">
                                  {(() => {
                                    const realSuggestions = getRealSuggestions(critere.suggestions || [])
                                    const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                                    const displayScore = getDisplayScore(mainSuggestion?.similarityScore || 0)
                                    // Badge Selected si sélectionné et score >= seuil
                                    if (mainSuggestion && mainSuggestion.isSelectedByUser && displayScore >= relevanceThreshold) {
                                      return <Badge variant="outline" className="text-xs px-1 py-0">Selected</Badge>
                                    }
                                    // Badge Best si bestMatch et score >= seuil
                                    if (mainSuggestion && mainSuggestion.isBestMatch && displayScore >= relevanceThreshold) {
                                      return <Badge variant="default" className="text-xs px-1 py-0">Best</Badge>
                                    }
                                    // Point rouge si score < seuil - dans les badges on garde le comportement par défaut
                                    if (mainSuggestion && displayScore < relevanceThreshold) {
                                      return null // On n'affiche plus de badge, le point rouge suffit
                                    }
                                    return null
                                  })()}
                                  {(() => {
                                    const realSuggestions = getRealSuggestions(critere.suggestions || [])
                                    const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                                    if (mainSuggestion && realSuggestions.length > 1) {
                                      return <span className="text-xs">▼</span>
                                    }
                                    return null
                                  })()}
                                </div>
                              </div>
                              {(() => {
                                const realSuggestions = getRealSuggestions(critere.suggestions || [])
                                if (realSuggestions.length > 1) {
                                  return (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {realSuggestions.length} suggestions disponibles
                                    </div>
                                  )
                                }
                                return null
                              })()}
                            </div>

                            {/* Dropdown avec toutes les suggestions */}
                            {dropdownOpen === critere.id && (
                              <div className="absolute top-full left-0 right-0 z-[9999] mt-1 bg-white border rounded-lg shadow-xl max-h-64 overflow-y-auto">
                                {getRealSuggestions(critere.suggestions || []).map((suggestion, index) => {
                                  const isVeryHighQuality = getDisplayScore(suggestion.similarityScore) >= 80
                                  const isHighQuality = getDisplayScore(suggestion.similarityScore) >= relevanceThreshold && getDisplayScore(suggestion.similarityScore) < 80
                                  const isMediumQuality = getDisplayScore(suggestion.similarityScore) >= 30 && getDisplayScore(suggestion.similarityScore) < relevanceThreshold
                                  const isLowQuality = getDisplayScore(suggestion.similarityScore) < 30
                                  return (
                                    <div
                                      key={suggestion.id}
                                      className={`p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                                        suggestion.isSelectedByUser ? 'bg-blue-50' :
                                        suggestion.isBestMatch && getDisplayScore(suggestion.similarityScore) >= relevanceThreshold ? 'bg-green-50' :
                                        getDisplayScore(suggestion.similarityScore) < relevanceThreshold ? 'bg-red-50' : ''
                                      }`}
                                      onClick={() => {
                                        handleSelectSuggestion(critere.id, suggestion.id)
                                        toggleDropdown(critere.id)
                                      }}
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <div className="font-medium text-sm truncate">{suggestion.label}</div>
                                            {/* Indicateur de qualité */}
                                            {isVeryHighQuality && <div className="w-2 h-2 bg-green-500 rounded-full" title="Très haute qualité"></div>}
                                            {isHighQuality && !isVeryHighQuality && <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Haute qualité"></div>}
                                            {isMediumQuality && !isHighQuality && <div className="w-2 h-2 bg-orange-500 rounded-full" title="Qualité moyenne"></div>}

                                          </div>
                                          <div className="text-xs text-muted-foreground mt-1">
                                            Score: {Math.round(getDisplayScore(suggestion.similarityScore))}% • 
                                            Audience: {formatAudience(suggestion.audience)} • 
                                            Type: interest
                                            {isLowQuality && <span className="text-red-600 font-medium"> • NON PERTINENTE</span>}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 ml-2">
                                          {suggestion.isSelectedByUser && <Badge variant="outline" className="text-xs px-1 py-0">Selected</Badge>}
                                          {suggestion.isBestMatch && getDisplayScore(suggestion.similarityScore) >= relevanceThreshold && <Badge variant="default" className="text-xs px-1 py-0">Best</Badge>}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Aucune suggestion</span>
                        )}
                      </td>

                      {/* Colonne Score */}
                      <td className="px-2 py-2">
                        {hasRealSuggestions(critere) ? (
                          <div className="flex items-center gap-2">
                            <div className={`font-mono text-sm ${(() => {
                              const realSuggestions = getRealSuggestions(critere.suggestions || [])
                              const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                              const displayScore = mainSuggestion ? getDisplayScore(mainSuggestion.similarityScore) : 0
                              return mainSuggestion && displayScore < relevanceThreshold ? 'text-red-600 font-bold' : ''
                            })()}`}>
                              {(() => {
                                const realSuggestions = getRealSuggestions(critere.suggestions || [])
                                const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                                const displayScore = mainSuggestion ? getDisplayScore(mainSuggestion.similarityScore) : 0
                                return Math.round(displayScore)
                              })()}%
                            </div>
                            {(() => {
                              const realSuggestions = getRealSuggestions(critere.suggestions || [])
                              const currentSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                              if (!currentSuggestion) return null
                              const displayScore = getDisplayScore(currentSuggestion.similarityScore)
                              return <div className={`w-2 h-2 rounded-full ${displayScore >= relevanceThreshold ? 'bg-green-500' : 'bg-red-500'}`} title={displayScore >= relevanceThreshold ? 'Pertinent' : 'Non pertinent'}></div>
                            })()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Colonne Audience */}
                      <td className="px-2 py-2">
                        {hasRealSuggestions(critere) ? (
                          <div className="font-mono text-sm">
                            {(() => {
                              const realSuggestions = getRealSuggestions(critere.suggestions || [])
                              const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                              return formatAudience(mainSuggestion?.audience || 0)
                            })()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      <td className="px-2 py-2">
                        <div className="flex gap-2">
                          <Button 
                            size="icon" 
                            variant="outline"
                            disabled={loadingIndividualUpdate.has(critere.id)}
                            onClick={() => handleIndividualUpdate(critere)}
                            title="Rafraîchir les suggestions Facebook"
                          >
                            <RefreshCw className={loadingIndividualUpdate.has(critere.id) ? 'animate-spin' : ''} size={18} />
                          </Button>
                          <Button size="icon" variant="outline" title="Éditer"><Edit size={18} /></Button>
                          <Button 
                            size="icon" 
                            variant="destructive" 
                            title="Supprimer" 
                            onClick={() => handleDeleteCritere(critere.id)}
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                  {paginated.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-4 text-muted-foreground">No criteria found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={resultsPerPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={setResultsPerPage}
              canPreviousPage={currentPage > 1}
              canNextPage={currentPage < totalPages}
            />
          </div>
        )}
      </div>
    )
  }

  // Affichage par défaut : toujours cards + progression + tableau (si critères disponibles)
  return (
    <div className="w-full flex flex-col gap-8 mt-8">
      {/* Cards de métriques - toujours affichées */}
      <div className="w-full max-w-none space-y-4">
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-none items-stretch h-[220px] min-h-[220px]">
          <Card className="flex-1 min-w-0 w-full max-w-none shadow-md border-2 flex flex-col h-[220px] min-h-[220px] justify-between">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">AI criteria</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 justify-end items-center p-0 m-0">
              <div className="text-4xl font-bold text-primary">{aiCriteriaCount}</div>
              <div className="text-muted-foreground text-sm whitespace-nowrap">Proposed by AI</div>
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-0 w-full max-w-none shadow-md border-2 flex flex-col h-[220px] min-h-[220px] justify-between">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">With Facebook suggestion</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 justify-end items-center p-0 m-0">
              <div className="text-4xl font-bold text-primary">{withFacebookCount}</div>
              <div className="text-muted-foreground text-sm whitespace-nowrap">Found suggestions</div>
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-0 w-full max-w-none shadow-md border-2 flex flex-col h-[220px] min-h-[220px] justify-between">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Valid criteria</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 justify-end items-center p-0 m-0">
              <div className="text-4xl font-bold text-primary">{validCriteriaCount}</div>
              <div className="text-muted-foreground text-sm whitespace-nowrap">Score {'\u2265'} {relevanceThreshold}</div>
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-0 w-full max-w-none shadow-md border-2 flex flex-col h-[220px] min-h-[220px] justify-between">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Total categories</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 justify-end items-center p-0 m-0">
              <div className="text-4xl font-bold text-primary">{metrics.totalCategories ?? 0}</div>
              <div className="text-muted-foreground text-sm whitespace-nowrap">Categories in project</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Barre de progression - uniquement si le projet n'est pas terminé */}
      {!isComplete && (
        <div className="w-full flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-muted-foreground">Progression</span>
            <span className="text-xs text-muted-foreground">{progress.current}/{progress.total} criteria</span>
          </div>
          <Progress value={progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0} />
          <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
            <span>Step: {progress.step}</span>
            <span>Errors: {progress.errors} | ETA: {progress.eta}</span>
          </div>
        </div>
      )}

      {/* Message d'attente si pas de critères */}
      {criteriaData.length === 0 && (
        <div className="w-full text-center text-muted-foreground py-12">
          <span>Results will be displayed once criteria are generated.</span>
        </div>
      )}

      {/* Tableau des critères - affiché dès qu'il y a des critères */}
      {criteriaData.length > 0 && (
        <div className="w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Input
                type="text"
                placeholder="Rechercher par nom ou catégorie..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-64"
              />
              <div style={{ minWidth: 220 }}>
                <Select
                  isMulti
                  options={relevanceFilter}
                  value={relevanceFilter}
                  onChange={opts => setRelevanceFilter(opts as typeof relevanceFilter)}
                  closeMenuOnSelect={false}
                  hideSelectedOptions={false}
                  placeholder="Filtrer..."
                  classNamePrefix="relevance-select"
                  styles={{
                    control: base => ({ ...base, minHeight: 36, borderRadius: 6 }),
                    menu: base => ({ ...base, zIndex: 50 }),
                    multiValue: base => ({ ...base, background: '#e0e7ff', color: '#1e40af' }),
                  }}
                />
              </div>
              <Button size="sm" variant="default" onClick={handleExportXLSX}>
                Exporter en XLSX
              </Button>
              {selected.length > 0 && (
                <div className="flex gap-2 items-center mb-2">
                  <BulkActionModal
                    action="update"
                    selectedCount={selected.length}
                    onConfirm={handleUpdateSelected}
                    isLoading={isUpdating}
                  >
                    <Button size="sm" variant="secondary" disabled={isUpdating}>
                      <RefreshCw size={16} className="mr-2" /> Update ({selected.length})
                    </Button>
                  </BulkActionModal>
                  <Button size="sm" variant="default" disabled={isRecalculating} onClick={recalculateSelectedScores}>
                    {isRecalculating ? (
                      <span className="flex items-center"><RefreshCw size={16} className="mr-2 animate-spin" />Recalcul en cours…</span>
                    ) : (
                      <span className="flex items-center"><RefreshCw size={16} className="mr-2" />Recalculer le score</span>
                    )}
                  </Button>
                  <BulkActionModal
                    action="delete"
                    selectedCount={selected.length}
                    onConfirm={handleDeleteSelected}
                  >
                    <Button size="sm" variant="destructive">
                      <Trash2 size={16} className="mr-2" /> Supprimer ({selected.length})
                    </Button>
                  </BulkActionModal>
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {selected.length > 0 && `${selected.length} selected • `}{filtered.length} criteria
            </div>
          </div>

          

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-2 py-3 text-left w-[50px]">
                    <Checkbox ref={selectAllRef} checked={paginated.every(c => selected.includes(c.id))} onCheckedChange={checked => checked ? selectAll() : deselectAll()} />
                  </th>
                  <th className="px-2 py-3 text-left cursor-pointer hover:bg-muted/70" onClick={() => { setSortBy('label'); setSortDir(sortBy === 'label' && sortDir === 'asc' ? 'desc' : 'asc') }}>
                    Nom {sortBy === 'label' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-2 py-3 text-left cursor-pointer hover:bg-muted/70" onClick={() => { setSortBy('category'); setSortDir(sortBy === 'category' && sortDir === 'asc' ? 'desc' : 'asc') }}>
                    Catégorie {sortBy === 'category' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-2 py-3 text-left">Suggestion Facebook</th>
                  <th className="px-2 py-3 text-left cursor-pointer hover:bg-muted/70" onClick={() => { setSortBy('relevance'); setSortDir(sortBy === 'relevance' && sortDir === 'asc' ? 'desc' : 'asc') }}>
                    Score {sortBy === 'relevance' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-2 py-3 text-left cursor-pointer hover:bg-muted/70" onClick={() => { setSortBy('audience'); setSortDir(sortBy === 'audience' && sortDir === 'asc' ? 'desc' : 'asc') }}>
                    Audience {sortBy === 'audience' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-2 py-3 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginated.map(critere => {
                  // Si le critère est en loading pour update individuel ou suppression, afficher le skeleton
                  if (loadingIndividualUpdate.has(critere.id) || loadingCriteria.has(critere.id)) {
                    return <CriteriaRowSkeleton key={critere.id} />
                  }

                  return (
                  <tr key={critere.id} className={`${selected.includes(critere.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-2 py-2"><Checkbox checked={selected.includes(critere.id)} onCheckedChange={() => toggleSelect(critere.id)} /></td>
                    <td className="px-2 py-2 font-medium">{critere.label}</td>
                    <td className="px-2 py-2">{critere.category}</td>
                    
                    {/* Colonne Suggestion Facebook avec dropdown */}
                    <td className="px-2 py-2">
                      {hasRealSuggestions(critere) ? (
                        <div className="relative">
                          {/* Suggestion principale affichée */}
                          <div 
                            className={(() => {
                              const realSuggestions = getRealSuggestions(critere.suggestions || [])
                              const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                              if (!mainSuggestion) return 'p-2 rounded border bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed'
                              const displayScore = getDisplayScore(mainSuggestion.similarityScore)
                              if (displayScore < relevanceThreshold) {
                                return 'p-2 rounded border bg-red-50 border-red-300 text-red-600 cursor-pointer hover:bg-red-100 transition-colors'
                              }
                              // Score >= seuil : vert si Best, bleu si Selected, gris sinon
                              if (mainSuggestion.isSelectedByUser) {
                                return 'p-2 rounded border bg-blue-100 border-blue-300 text-blue-900 cursor-pointer hover:bg-opacity-80 transition-colors'
                              }
                              if (mainSuggestion.isBestMatch) {
                                return 'p-2 rounded border bg-green-100 border-green-300 text-green-900 cursor-pointer hover:bg-opacity-80 transition-colors'
                              }
                              return 'p-2 rounded border bg-gray-100 border-gray-300 text-gray-900 cursor-pointer hover:bg-opacity-80 transition-colors'
                            })()}
                            onClick={() => {
                              const realSuggestions = getRealSuggestions(critere.suggestions || [])
                              const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                              if (!mainSuggestion) return
                              toggleDropdown(critere.id)
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm truncate max-w-[200px]">
                                {(() => {
                                  const realSuggestions = getRealSuggestions(critere.suggestions || [])
                                  const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                                  return mainSuggestion?.label
                                })()}
                                {/* Badge non pertinent si score < seuil */}
                                {(() => {
                                  const realSuggestions = getRealSuggestions(critere.suggestions || [])
                                  const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                                  if (mainSuggestion && getDisplayScore(mainSuggestion.similarityScore) < relevanceThreshold) {
                                    return null
                                  }
                                  return null
                                })()}
                              </span>
                              <div className="flex items-center gap-1">
                                {(() => {
                                  const realSuggestions = getRealSuggestions(critere.suggestions || [])
                                  const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                                  const displayScore = getDisplayScore(mainSuggestion?.similarityScore || 0)
                                  // Badge Selected si sélectionné et score >= seuil
                                  if (mainSuggestion && mainSuggestion.isSelectedByUser && displayScore >= relevanceThreshold) {
                                    return <Badge variant="outline" className="text-xs px-1 py-0">Selected</Badge>
                                  }
                                  // Badge Best si bestMatch et score >= seuil
                                  if (mainSuggestion && mainSuggestion.isBestMatch && displayScore >= relevanceThreshold) {
                                    return <Badge variant="default" className="text-xs px-1 py-0">Best</Badge>
                                  }
                                  // Point rouge si score < seuil - dans les badges on garde le comportement par défaut
                                  if (mainSuggestion && displayScore < relevanceThreshold) {
                                    return null // On n'affiche plus de badge, le point rouge suffit
                                  }
                                  return null
                                })()}
                                {(() => {
                                  const realSuggestions = getRealSuggestions(critere.suggestions || [])
                                  const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                                  if (mainSuggestion && realSuggestions.length > 1) {
                                    return <span className="text-xs">▼</span>
                                  }
                                  return null
                                })()}
                              </div>
                            </div>
                            {(() => {
                              const realSuggestions = getRealSuggestions(critere.suggestions || [])
                              if (realSuggestions.length > 1) {
                                return (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {realSuggestions.length} suggestions disponibles
                                  </div>
                                )
                              }
                              return null
                            })()}
                          </div>

                          {/* Dropdown avec toutes les suggestions */}
                          {dropdownOpen === critere.id && (
                            <div className="absolute top-full left-0 right-0 z-[9999] mt-1 bg-white border rounded-lg shadow-xl max-h-64 overflow-y-auto">
                              {getRealSuggestions(critere.suggestions || []).map((suggestion, index) => {
                                const isVeryHighQuality = getDisplayScore(suggestion.similarityScore) >= 80
                                const isHighQuality = getDisplayScore(suggestion.similarityScore) >= relevanceThreshold && getDisplayScore(suggestion.similarityScore) < 80
                                const isMediumQuality = getDisplayScore(suggestion.similarityScore) >= 30 && getDisplayScore(suggestion.similarityScore) < relevanceThreshold
                                const isLowQuality = getDisplayScore(suggestion.similarityScore) < 30
                                return (
                                  <div
                                    key={suggestion.id}
                                    className={`p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                                      suggestion.isSelectedByUser ? 'bg-blue-50' :
                                      suggestion.isBestMatch && getDisplayScore(suggestion.similarityScore) >= relevanceThreshold ? 'bg-green-50' :
                                      getDisplayScore(suggestion.similarityScore) < relevanceThreshold ? 'bg-red-50' : ''
                                    }`}
                                    onClick={() => {
                                      handleSelectSuggestion(critere.id, suggestion.id)
                                      toggleDropdown(critere.id)
                                    }}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <div className="font-medium text-sm truncate">{suggestion.label}</div>
                                          {/* Indicateur de qualité */}
                                          {isVeryHighQuality && <div className="w-2 h-2 bg-green-500 rounded-full" title="Très haute qualité"></div>}
                                          {isHighQuality && !isVeryHighQuality && <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Haute qualité"></div>}
                                          {isMediumQuality && !isHighQuality && <div className="w-2 h-2 bg-orange-500 rounded-full" title="Qualité moyenne"></div>}

                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                          Score: {Math.round(getDisplayScore(suggestion.similarityScore))}% • 
                                          Audience: {formatAudience(suggestion.audience)} • 
                                          Type: interest
                                          {isLowQuality && <span className="text-red-600 font-medium"> • NON PERTINENTE</span>}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 ml-2">
                                        {suggestion.isSelectedByUser && <Badge variant="outline" className="text-xs px-1 py-0">Selected</Badge>}
                                        {suggestion.isBestMatch && getDisplayScore(suggestion.similarityScore) >= relevanceThreshold && <Badge variant="default" className="text-xs px-1 py-0">Best</Badge>}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Aucune suggestion</span>
                      )}
                    </td>

                    {/* Colonne Score */}
                    <td className="px-2 py-2">
                      {hasRealSuggestions(critere) ? (
                        <div className="flex items-center gap-2">
                          <div className={`font-mono text-sm ${(() => {
                            const realSuggestions = getRealSuggestions(critere.suggestions || [])
                            const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                            const displayScore = mainSuggestion ? getDisplayScore(mainSuggestion.similarityScore) : 0
                            return mainSuggestion && displayScore < relevanceThreshold ? 'text-red-600 font-bold' : ''
                          })()}`}>
                            {(() => {
                              const realSuggestions = getRealSuggestions(critere.suggestions || [])
                              const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                              const displayScore = mainSuggestion ? getDisplayScore(mainSuggestion.similarityScore) : 0
                              return Math.round(displayScore)
                            })()}%
                          </div>
                          {(() => {
                            const realSuggestions = getRealSuggestions(critere.suggestions || [])
                            const currentSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                            if (!currentSuggestion) return null
                            const displayScore = getDisplayScore(currentSuggestion.similarityScore)
                            return <div className={`w-2 h-2 rounded-full ${displayScore >= relevanceThreshold ? 'bg-green-500' : 'bg-red-500'}`} title={displayScore >= relevanceThreshold ? 'Pertinent' : 'Non pertinent'}></div>
                          })()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    {/* Colonne Audience */}
                    <td className="px-2 py-2">
                      {hasRealSuggestions(critere) ? (
                        <div className="font-mono text-sm">
                          {(() => {
                            const realSuggestions = getRealSuggestions(critere.suggestions || [])
                            const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                            return formatAudience(mainSuggestion?.audience || 0)
                          })()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <Button 
                          size="icon" 
                          variant="outline"
                          disabled={loadingIndividualUpdate.has(critere.id)}
                          onClick={() => handleIndividualUpdate(critere)}
                          title="Rafraîchir les suggestions Facebook"
                        >
                          <RefreshCw className={loadingIndividualUpdate.has(critere.id) ? 'animate-spin' : ''} size={18} />
                        </Button>
                        <EditCriteriaModal
                          critere={critere}
                          categoriesData={categoriesData}
                          onCriteriaUpdated={onDataChange}
                        >
                          <Button 
                            size="icon" 
                            variant="outline" 
                            title="Éditer"
                            onClick={() => console.log('Edit button clicked in ProjectResults for:', critere)}
                          >
                            <Edit size={18} />
                          </Button>
                        </EditCriteriaModal>
                        <Button 
                          size="icon" 
                          variant="destructive" 
                          title="Supprimer"
                          onClick={() => handleDeleteCritere(critere.id)}
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
                {paginated.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-4 text-muted-foreground">No criteria found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination controls */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={resultsPerPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setResultsPerPage}
            canPreviousPage={currentPage > 1}
            canNextPage={currentPage < totalPages}
          />
        </div>
      )}
    </div>
  )
}

export default ProjectResults 