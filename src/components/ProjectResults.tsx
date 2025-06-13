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
import { RefreshCw, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import Select from 'react-select'

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
  [key: string]: any
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'label' | 'category' | 'status'>('label')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [loadingFacebook, setLoadingFacebook] = useState<{ [key: string]: boolean }>({})
  const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: boolean }>({})
  const { success, error: showError } = useToast()
  const [filterRelevant, setFilterRelevant] = useState(true)
  const [filterNonRelevant, setFilterNonRelevant] = useState(true)
  const [resultsPerPage, setResultsPerPage] = useState(100)
  const [currentPage, setCurrentPage] = useState(1)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0 })
  const [currentlyProcessing, setCurrentlyProcessing] = useState<string>('')
  const [updateKey, setUpdateKey] = useState(0)

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
  const [relevanceFilter, setRelevanceFilter] = useState([
    relevanceOptions[0],
    relevanceOptions[1],
    relevanceOptions[2],
  ])

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
      // Recharger les données
      window.location.reload()
    } catch (error: any) {
      console.error('❌ Erreur sélection suggestion:', error)
      showError(error.message || 'Erreur lors de la sélection')
    }
  }

  // Fonction pour basculer l'état du dropdown
  const toggleDropdown = (critereId: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [critereId]: !prev[critereId]
    }))
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
      
      // Recharger les données pour voir les nouvelles suggestions
      window.location.reload()
      
    } catch (error: any) {
      console.error('❌ Erreur suggestions Facebook:', error)
      showError(error.message || 'Erreur lors de la récupération des suggestions Facebook', { duration: 5000 })
    } finally {
      setLoadingFacebook(prev => ({ ...prev, [critere.id]: false }))
      setIsUpdating(false)
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
      const isRelevant = mainSuggestion && mainSuggestion.similarityScore >= relevanceThreshold
      const showRelevant = relevanceFilter.some(opt => opt.value === 'relevant')
      const showNonRelevant = relevanceFilter.some(opt => opt.value === 'nonrelevant')
      const showNoSuggestion = relevanceFilter.some(opt => opt.value === 'nosuggestion')
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
      const vA = a[sortBy] || ''
      const vB = b[sortBy] || ''
      if (vA < vB) return sortDir === 'asc' ? -1 : 1
      if (vA > vB) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return data
  }, [criteriaData, search, sortBy, sortDir, relevanceFilter, relevanceThreshold])

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
        setOpenDropdowns({})
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    // Reset page si filtre ou nombre de résultats change
    setCurrentPage(1)
  }, [resultsPerPage, search, sortBy, sortDir, relevanceFilter])

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
  const validCriteriaCount = criteriaData.filter(critere => {
    if (!hasRealSuggestions(critere)) return false
    const realSuggestions = getRealSuggestions(critere.suggestions || [])
    const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
    return mainSuggestion && mainSuggestion.similarityScore >= relevanceThreshold
  }).length

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
    if (!window.confirm(`Supprimer ${selected.length} critère(s) sélectionné(s) ? Cette action est irréversible.`)) return
    try {
      const results = await Promise.all(selected.map(id =>
        fetch(`/api/criteres/${id}`, { method: 'DELETE' })
      ))
      const allOk = results.every(r => r.ok)
      if (allOk) {
        success(`${selected.length} critère(s) supprimé(s)`)
      } else {
        showError('Erreur lors de la suppression de certains critères')
      }
      window.location.reload()
    } catch (e) {
      showError('Erreur lors de la suppression')
    }
  }

  // Relancer le check de suggestion pour la sélection
  const handleUpdateSelected = async () => {
    console.log('🚀 DÉBUT handleUpdateSelected - selected.length:', selected.length)
    
    if (selected.length === 0) {
      console.log('❌ Aucun critère sélectionné, arrêt')
      return
    }
    
    if (!window.confirm(`Relancer la récupération des suggestions Facebook pour ${selected.length} critère(s) ?`)) {
      console.log('❌ Utilisateur a annulé')
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
      
      // Attendre un peu avant de recharger pour que l'utilisateur voie la completion
      console.log('⏳ Attente 1000ms avant reload...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Recharger les données pour voir les nouvelles suggestions
      console.log('🔄 Rechargement de la page...')
      window.location.reload()
      
    } catch (e) {
      console.error('❌ ERREUR GLOBALE:', e)
      showError('Erreur lors de la mise à jour')
    } finally {
      console.log('🏁 NETTOYAGE FINAL - Remise à zéro des états avec flushSync...')
      flushSync(() => {
        setIsUpdating(false)
        setUpdateProgress({ current: 0, total: 0 })
        setCurrentlyProcessing('')
      })
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
        {/* Barre de progression */}
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
                    options={relevanceOptions}
                    value={relevanceFilter}
                    onChange={opts => setRelevanceFilter(opts as typeof relevanceOptions)}
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
                  <>
                    <Button size="sm" variant="secondary" onClick={handleUpdateSelected}>
                      <RefreshCw size={16} className="mr-2" /> Update ({selected.length})
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
                      <Trash2 size={16} className="mr-2" /> Supprimer ({selected.length})
                    </Button>
                  </>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {selected.length > 0 && `${selected.length} selected • `}{filtered.length} criteria
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm">Résultats par page :</span>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={resultsPerPage}
                onChange={e => setResultsPerPage(Number(e.target.value))}
              >
                {resultsPerPageOptions.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-muted-foreground text-xs">{totalResults} résultats</span>
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
                    <th className="px-2 py-3 text-left">Score</th>
                    <th className="px-2 py-3 text-left">Audience</th>
                    <th className="px-2 py-3 text-left">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginated.map(critere => (
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
                                if (mainSuggestion.similarityScore < relevanceThreshold) {
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
                                    if (mainSuggestion && mainSuggestion.similarityScore < relevanceThreshold) {
                                      return <span className="ml-2 text-xs text-red-600 font-semibold">Non pertinent</span>
                                    }
                                    return null
                                  })()}
                                </span>
                                <div className="flex items-center gap-1">
                                  {(() => {
                                    const realSuggestions = getRealSuggestions(critere.suggestions || [])
                                    const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                                    // Badge Selected si sélectionné et score >= seuil
                                    if (mainSuggestion && mainSuggestion.isSelectedByUser && mainSuggestion.similarityScore >= relevanceThreshold) {
                                      return <Badge variant="outline" className="text-xs px-1 py-0">Selected</Badge>
                                    }
                                    // Badge Best si bestMatch et score >= seuil
                                    if (mainSuggestion && mainSuggestion.isBestMatch && mainSuggestion.similarityScore >= relevanceThreshold) {
                                      return <Badge variant="default" className="text-xs px-1 py-0">Best</Badge>
                                    }
                                    // Badge Non pertinent si score < seuil
                                    if (mainSuggestion && mainSuggestion.similarityScore < relevanceThreshold) {
                                      return <Badge variant="destructive" className="text-xs px-1 py-0">Non pertinent</Badge>
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
                            {openDropdowns[critere.id] && (
                              <div className="absolute top-full left-0 right-0 z-[9999] mt-1 bg-white border rounded-lg shadow-xl max-h-64 overflow-y-auto">
                                {getRealSuggestions(critere.suggestions || []).map((suggestion, index) => {
                                  const isVeryHighQuality = suggestion.similarityScore >= 80
                                  const isHighQuality = suggestion.similarityScore >= relevanceThreshold && suggestion.similarityScore < 80
                                  const isMediumQuality = suggestion.similarityScore >= 30 && suggestion.similarityScore < relevanceThreshold
                                  const isLowQuality = suggestion.similarityScore < 30
                                  return (
                                    <div
                                      key={suggestion.id}
                                      className={`p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                                        suggestion.isSelectedByUser ? 'bg-blue-50' :
                                        suggestion.isBestMatch && suggestion.similarityScore >= relevanceThreshold ? 'bg-green-50' :
                                        suggestion.similarityScore < relevanceThreshold ? 'bg-red-50' : ''
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
                                            {isLowQuality && <div className="w-2 h-2 bg-red-500 rounded-full" title="Faible qualité - Non pertinente"></div>}
                                          </div>
                                          <div className="text-xs text-muted-foreground mt-1">
                                            Score: {suggestion.similarityScore}% • 
                                            Audience: {formatAudience(suggestion.audience)} • 
                                            Type: interest
                                            {isLowQuality && <span className="text-red-600 font-medium"> • NON PERTINENTE</span>}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 ml-2">
                                          {suggestion.isSelectedByUser && <Badge variant="outline" className="text-xs px-1 py-0">Selected</Badge>}
                                          {suggestion.isBestMatch && suggestion.similarityScore >= relevanceThreshold && <Badge variant="default" className="text-xs px-1 py-0">Best</Badge>}
                                          {suggestion.similarityScore < relevanceThreshold && <Badge variant="destructive" className="text-xs px-1 py-0">Non pertinent</Badge>}
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
                              return mainSuggestion && mainSuggestion.similarityScore < relevanceThreshold ? 'text-red-600 font-bold' : ''
                            })()}`}>
                              {(() => {
                                const realSuggestions = getRealSuggestions(critere.suggestions || [])
                                const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                                return mainSuggestion?.similarityScore
                              })()}%
                            </div>
                            {(() => {
                              const realSuggestions = getRealSuggestions(critere.suggestions || [])
                              const currentSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                              if (!currentSuggestion) return null
                              const score = currentSuggestion.similarityScore
                              return <div className={`w-2 h-2 rounded-full ${score >= relevanceThreshold ? 'bg-green-500' : 'bg-red-500'}`} title={score >= relevanceThreshold ? 'Pertinent' : 'Non pertinent'}></div>
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
                            disabled={loadingFacebook[critere.id]}
                            onClick={() => handleGetFacebookSuggestions(critere)}
                            title="Rafraîchir les suggestions Facebook"
                          >
                            <RefreshCw className={loadingFacebook[critere.id] ? 'animate-spin' : ''} size={18} />
                          </Button>
                          <Button size="icon" variant="outline" title="Éditer"><Edit size={18} /></Button>
                          <Button size="icon" variant="destructive" title="Supprimer"><Trash2 size={18} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-4 text-muted-foreground">No criteria found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination controls */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-muted-foreground">
                Page {currentPage} sur {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                  <ChevronLeft size={18} />
                </Button>
                {[...Array(totalPages).keys()].slice(Math.max(0, currentPage - 3), currentPage + 2).map(i => (
                  <Button
                    key={i + 1}
                    size="sm"
                    variant={currentPage === i + 1 ? 'default' : 'outline'}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button size="icon" variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                  <ChevronRight size={18} />
                </Button>
              </div>
            </div>
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

      {/* Barre de progression - toujours affichée */}
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
                  options={relevanceOptions}
                  value={relevanceFilter}
                  onChange={opts => setRelevanceFilter(opts as typeof relevanceOptions)}
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
                <>
                  <Button size="sm" variant="secondary" onClick={handleUpdateSelected}>
                    <RefreshCw size={16} className="mr-2" /> Update ({selected.length})
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
                    <Trash2 size={16} className="mr-2" /> Supprimer ({selected.length})
                  </Button>
                </>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {selected.length > 0 && `${selected.length} selected • `}{filtered.length} criteria
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm">Résultats par page :</span>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={resultsPerPage}
              onChange={e => setResultsPerPage(Number(e.target.value))}
            >
              {resultsPerPageOptions.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-muted-foreground text-xs">{totalResults} résultats</span>
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
                  <th className="px-2 py-3 text-left">Score</th>
                  <th className="px-2 py-3 text-left">Audience</th>
                  <th className="px-2 py-3 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginated.map(critere => (
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
                              if (mainSuggestion.similarityScore < relevanceThreshold) {
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
                                  if (mainSuggestion && mainSuggestion.similarityScore < relevanceThreshold) {
                                    return <span className="ml-2 text-xs text-red-600 font-semibold">Non pertinent</span>
                                  }
                                  return null
                                })()}
                              </span>
                              <div className="flex items-center gap-1">
                                {(() => {
                                  const realSuggestions = getRealSuggestions(critere.suggestions || [])
                                  const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                                  // Badge Selected si sélectionné et score >= seuil
                                  if (mainSuggestion && mainSuggestion.isSelectedByUser && mainSuggestion.similarityScore >= relevanceThreshold) {
                                    return <Badge variant="outline" className="text-xs px-1 py-0">Selected</Badge>
                                  }
                                  // Badge Best si bestMatch et score >= seuil
                                  if (mainSuggestion && mainSuggestion.isBestMatch && mainSuggestion.similarityScore >= relevanceThreshold) {
                                    return <Badge variant="default" className="text-xs px-1 py-0">Best</Badge>
                                  }
                                  // Badge Non pertinent si score < seuil
                                  if (mainSuggestion && mainSuggestion.similarityScore < relevanceThreshold) {
                                    return <Badge variant="destructive" className="text-xs px-1 py-0">Non pertinent</Badge>
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
                          {openDropdowns[critere.id] && (
                            <div className="absolute top-full left-0 right-0 z-[9999] mt-1 bg-white border rounded-lg shadow-xl max-h-64 overflow-y-auto">
                              {getRealSuggestions(critere.suggestions || []).map((suggestion, index) => {
                                const isVeryHighQuality = suggestion.similarityScore >= 80
                                const isHighQuality = suggestion.similarityScore >= relevanceThreshold && suggestion.similarityScore < 80
                                const isMediumQuality = suggestion.similarityScore >= 30 && suggestion.similarityScore < relevanceThreshold
                                const isLowQuality = suggestion.similarityScore < 30
                                return (
                                  <div
                                    key={suggestion.id}
                                    className={`p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                                      suggestion.isSelectedByUser ? 'bg-blue-50' :
                                      suggestion.isBestMatch && suggestion.similarityScore >= relevanceThreshold ? 'bg-green-50' :
                                      suggestion.similarityScore < relevanceThreshold ? 'bg-red-50' : ''
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
                                          {isLowQuality && <div className="w-2 h-2 bg-red-500 rounded-full" title="Faible qualité - Non pertinente"></div>}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                          Score: {suggestion.similarityScore}% • 
                                          Audience: {formatAudience(suggestion.audience)} • 
                                          Type: interest
                                          {isLowQuality && <span className="text-red-600 font-medium"> • NON PERTINENTE</span>}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 ml-2">
                                        {suggestion.isSelectedByUser && <Badge variant="outline" className="text-xs px-1 py-0">Selected</Badge>}
                                        {suggestion.isBestMatch && suggestion.similarityScore >= relevanceThreshold && <Badge variant="default" className="text-xs px-1 py-0">Best</Badge>}
                                        {suggestion.similarityScore < relevanceThreshold && <Badge variant="destructive" className="text-xs px-1 py-0">Non pertinent</Badge>}
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
                            return mainSuggestion && mainSuggestion.similarityScore < relevanceThreshold ? 'text-red-600 font-bold' : ''
                          })()}`}>
                            {(() => {
                              const realSuggestions = getRealSuggestions(critere.suggestions || [])
                              const mainSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                              return mainSuggestion?.similarityScore
                            })()}%
                          </div>
                          {(() => {
                            const realSuggestions = getRealSuggestions(critere.suggestions || [])
                            const currentSuggestion = realSuggestions.find(s => s.isSelectedByUser) || realSuggestions.find(s => s.isBestMatch) || realSuggestions[0]
                            if (!currentSuggestion) return null
                            const score = currentSuggestion.similarityScore
                            return <div className={`w-2 h-2 rounded-full ${score >= relevanceThreshold ? 'bg-green-500' : 'bg-red-500'}`} title={score >= relevanceThreshold ? 'Pertinent' : 'Non pertinent'}></div>
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
                          disabled={loadingFacebook[critere.id]}
                          onClick={() => handleGetFacebookSuggestions(critere)}
                          title="Rafraîchir les suggestions Facebook"
                        >
                          <RefreshCw className={loadingFacebook[critere.id] ? 'animate-spin' : ''} size={18} />
                        </Button>
                        <Button size="icon" variant="outline" title="Éditer"><Edit size={18} /></Button>
                        <Button size="icon" variant="destructive" title="Supprimer"><Trash2 size={18} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-4 text-muted-foreground">No criteria found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-muted-foreground">
              Page {currentPage} sur {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                <ChevronLeft size={18} />
              </Button>
              {[...Array(totalPages).keys()].slice(Math.max(0, currentPage - 3), currentPage + 2).map(i => (
                <Button
                  key={i + 1}
                  size="sm"
                  variant={currentPage === i + 1 ? 'default' : 'outline'}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button size="icon" variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                <ChevronRight size={18} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectResults 