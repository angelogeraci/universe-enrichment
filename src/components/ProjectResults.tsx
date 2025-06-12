'use client'

import React, { useMemo, useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'
import { Badge } from './ui/badge'
import { useToast } from '@/hooks/useToast'
import * as XLSX from 'xlsx'
import { RefreshCw, Edit, Trash2 } from 'lucide-react'
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
  categoriesData = []
}: {
  isComplete?: boolean
  metrics?: { aiCriteria: number, withFacebook: number, valid: number, totalCategories?: number }
  progress?: { current: number, total: number, step: string, errors: number, eta: string }
  onlyMetrics?: boolean
  onlyProgress?: boolean
  criteriaData?: Critere[]
  categoriesData?: Array<{ name: string, path: string[], andCriteria?: string[] }>
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
    }
  }

  // Filtrage et tri
  const filtered = useMemo(() => {
    let data = criteriaData
    // Filtrage par pertinence multi-select + sans suggestion
    data = data.filter(critere => {
      const hasSuggestions = critere.suggestions && critere.suggestions.length > 0
      const mainSuggestion = hasSuggestions ? (critere.suggestions.find(s => s.isSelectedByUser) || critere.suggestions.find(s => s.isBestMatch) || critere.suggestions[0]) : null
      const isRelevant = mainSuggestion && mainSuggestion.similarityScore >= 50
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
  }, [criteriaData, search, sortBy, sortDir, relevanceFilter])

  const toggleSelect = (id: string) => {
    setSelected(sel => sel.includes(id) ? sel.filter(s => s !== id) : [...sel, id])
  }
  const selectAll = () => setSelected(filtered.map(c => c.id))
  const deselectAll = () => setSelected([])

  // Ref pour la checkbox "select all" (Radix UI = bouton)
  const selectAllRef = useRef<HTMLButtonElement>(null)

  // Gestion état indeterminé de la checkbox "select all"
  useEffect(() => {
    if (selectAllRef.current) {
      const isIndeterminate = selected.length > 0 && selected.length < filtered.length
      selectAllRef.current.setAttribute('data-state', isIndeterminate ? 'indeterminate' : selected.length === filtered.length ? 'checked' : 'unchecked')
    }
  }, [selected, filtered])

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
  const withFacebookCount = criteriaData.filter(c => c.suggestions && c.suggestions.length > 0).length
  const validCriteriaCount = criteriaData.filter(critere => {
    if (!critere.suggestions || critere.suggestions.length === 0) return false
    const mainSuggestion = critere.suggestions.find(s => s.isSelectedByUser) || critere.suggestions.find(s => s.isBestMatch) || critere.suggestions[0]
    return mainSuggestion && mainSuggestion.similarityScore >= 50
  }).length

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
              <div className="text-muted-foreground text-sm whitespace-nowrap">Score {'\u2265'} 50</div>
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
                <Button size="sm" variant="destructive" onClick={handleDeleteSelected} disabled={selected.length === 0}>
                  <Trash2 size={16} className="mr-2" /> Supprimer la sélection
                </Button>
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
                      <Checkbox ref={selectAllRef} checked={selected.length === filtered.length} onCheckedChange={checked => checked ? selectAll() : deselectAll()} />
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
                  {filtered.map(critere => (
                    <tr key={critere.id} className={`${selected.includes(critere.id) ? 'bg-blue-50' : ''} ${(() => {
                      const mainSuggestion = critere.suggestions?.find(s => s.isSelectedByUser) || critere.suggestions?.find(s => s.isBestMatch) || critere.suggestions?.[0]
                      return mainSuggestion && mainSuggestion.similarityScore < 50 ? 'opacity-60 pointer-events-auto cursor-not-allowed' : ''
                    })()}`}>
                      <td className="px-2 py-2"><Checkbox checked={selected.includes(critere.id)} onCheckedChange={() => toggleSelect(critere.id)} /></td>
                      <td className="px-2 py-2 font-medium">{critere.label}</td>
                      <td className="px-2 py-2">{critere.category}</td>
                      
                      {/* Colonne Suggestion Facebook avec dropdown */}
                      <td className="px-2 py-2">
                        {critere.suggestions && critere.suggestions.length > 0 ? (
                          <div className="relative">
                            {/* Suggestion principale affichée */}
                            <div 
                              className={(() => {
                                const mainSuggestion = critere.suggestions.find(s => s.isSelectedByUser) || critere.suggestions.find(s => s.isBestMatch) || critere.suggestions[0]
                                if (mainSuggestion && mainSuggestion.similarityScore < 50) {
                                  return 'p-2 rounded border bg-red-50 border-red-300 text-red-600 cursor-not-allowed opacity-60'
                                }
                                return `cursor-pointer p-2 rounded border ${
                                  critere.suggestions.find(s => s.isSelectedByUser || s.isBestMatch)?.isSelectedByUser 
                                    ? 'bg-blue-100 border-blue-300' 
                                    : critere.suggestions.find(s => s.isBestMatch)?.isBestMatch 
                                      ? 'bg-green-100 border-green-300' 
                                      : 'bg-gray-100 border-gray-300'
                                } hover:bg-opacity-80 transition-colors`
                              })()}
                              onClick={() => {
                                const mainSuggestion = critere.suggestions.find(s => s.isSelectedByUser) || critere.suggestions.find(s => s.isBestMatch) || critere.suggestions[0]
                                if (mainSuggestion && mainSuggestion.similarityScore < 50) return
                                toggleDropdown(critere.id)
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm truncate max-w-[200px]">
                                  {(critere.suggestions.find(s => s.isSelectedByUser) || critere.suggestions.find(s => s.isBestMatch) || critere.suggestions[0])?.label}
                                  {/* Badge non pertinent si score < 50% */}
                                  {(() => {
                                    const mainSuggestion = critere.suggestions.find(s => s.isSelectedByUser) || critere.suggestions.find(s => s.isBestMatch) || critere.suggestions[0]
                                    if (mainSuggestion && mainSuggestion.similarityScore < 50) {
                                      return <span className="ml-2 text-xs text-red-600 font-semibold">Non pertinent</span>
                                    }
                                    return null
                                  })()}
                                </span>
                                <div className="flex items-center gap-1">
                                  {critere.suggestions.find(s => s.isSelectedByUser) && <Badge variant="outline" className="text-xs px-1 py-0">Selected</Badge>}
                                  {!critere.suggestions.find(s => s.isSelectedByUser) && critere.suggestions.find(s => s.isBestMatch) && <Badge variant="default" className="text-xs px-1 py-0">Best</Badge>}
                                  <span className="text-xs">▼</span>
                                </div>
                              </div>
                              {critere.suggestions.length > 1 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {critere.suggestions.length} suggestions disponibles
                                </div>
                              )}
                            </div>

                            {/* Dropdown avec toutes les suggestions */}
                            {openDropdowns[critere.id] && (
                              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                {critere.suggestions.map((suggestion, index) => {
                                  // Détermination de la pertinence basée sur le score
                                  const isHighQuality = suggestion.similarityScore >= 60
                                  const isMediumQuality = suggestion.similarityScore >= 30
                                  const isLowQuality = suggestion.similarityScore < 30
                                  
                                  return (
                                    <div
                                      key={suggestion.id}
                                      className={`p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${
                                        suggestion.isSelectedByUser ? 'bg-blue-50' : suggestion.isBestMatch ? 'bg-green-50' : ''
                                      } ${isLowQuality ? 'opacity-60' : ''}`}
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
                                            {isHighQuality && <div className="w-2 h-2 bg-green-500 rounded-full" title="Haute qualité"></div>}
                                            {isMediumQuality && !isHighQuality && <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Qualité moyenne"></div>}
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
                                          {suggestion.isBestMatch && <Badge variant="default" className="text-xs px-1 py-0">Best</Badge>}
                                          {isLowQuality && <Badge variant="destructive" className="text-xs px-1 py-0">Low</Badge>}
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
                        {critere.suggestions && critere.suggestions.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="font-mono text-sm">
                              {(critere.suggestions.find(s => s.isSelectedByUser) || critere.suggestions.find(s => s.isBestMatch) || critere.suggestions[0])?.similarityScore}%
                            </div>
                            {(() => {
                              const currentSuggestion = critere.suggestions.find(s => s.isSelectedByUser) || critere.suggestions.find(s => s.isBestMatch) || critere.suggestions[0]
                              if (!currentSuggestion) return null
                              const score = currentSuggestion.similarityScore
                              return <div className={`w-2 h-2 rounded-full ${score >= 50 ? 'bg-green-500' : 'bg-red-500'}`} title={score >= 50 ? 'Pertinent' : 'Non pertinent'}></div>
                            })()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Colonne Audience */}
                      <td className="px-2 py-2">
                        {critere.suggestions && critere.suggestions.length > 0 ? (
                          <div className="font-mono text-sm">
                            {formatAudience((critere.suggestions.find(s => s.isSelectedByUser) || critere.suggestions.find(s => s.isBestMatch) || critere.suggestions[0])?.audience || 0)}
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
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-4 text-muted-foreground">No criteria found.</td></tr>
                  )}
                </tbody>
              </table>
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
              <div className="text-muted-foreground text-sm whitespace-nowrap">Score {'\u2265'} 50</div>
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
              <Button size="sm" variant="destructive" onClick={handleDeleteSelected} disabled={selected.length === 0}>
                <Trash2 size={16} className="mr-2" /> Supprimer la sélection
              </Button>
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
                    <Checkbox ref={selectAllRef} checked={selected.length === filtered.length} onCheckedChange={checked => checked ? selectAll() : deselectAll()} />
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
                {filtered.map(critere => (
                  <tr key={critere.id} className={`${selected.includes(critere.id) ? 'bg-blue-50' : ''} ${(() => {
                    const mainSuggestion = critere.suggestions?.find(s => s.isSelectedByUser) || critere.suggestions?.find(s => s.isBestMatch) || critere.suggestions?.[0]
                    return mainSuggestion && mainSuggestion.similarityScore < 50 ? 'opacity-60 pointer-events-auto cursor-not-allowed' : ''
                  })()}`}>
                    <td className="px-2 py-2"><Checkbox checked={selected.includes(critere.id)} onCheckedChange={() => toggleSelect(critere.id)} /></td>
                    <td className="px-2 py-2 font-medium">{critere.label}</td>
                    <td className="px-2 py-2">{critere.category}</td>
                    
                    {/* Colonne Suggestion Facebook avec dropdown */}
                    <td className="px-2 py-2">
                      {critere.suggestions && critere.suggestions.length > 0 ? (
                        <div className="relative">
                          {/* Suggestion principale affichée */}
                          <div 
                            className={(() => {
                              const mainSuggestion = critere.suggestions.find(s => s.isSelectedByUser) || critere.suggestions.find(s => s.isBestMatch) || critere.suggestions[0]
                              if (mainSuggestion && mainSuggestion.similarityScore < 50) {
                                return 'p-2 rounded border bg-red-50 border-red-300 text-red-600 cursor-not-allowed opacity-60'
                              }
                              return `cursor-pointer p-2 rounded border ${
                                critere.suggestions.find(s => s.isSelectedByUser || s.isBestMatch)?.isSelectedByUser 
                                  ? 'bg-blue-100 border-blue-300' 
                                  : critere.suggestions.find(s => s.isBestMatch)?.isBestMatch 
                                    ? 'bg-green-100 border-green-300' 
                                    : 'bg-gray-100 border-gray-300'
                              } hover:bg-opacity-80 transition-colors`
                            })()}
                            onClick={() => {
                              const mainSuggestion = critere.suggestions.find(s => s.isSelectedByUser) || critere.suggestions.find(s => s.isBestMatch) || critere.suggestions[0]
                              if (mainSuggestion && mainSuggestion.similarityScore < 50) return
                              toggleDropdown(critere.id)
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm truncate max-w-[200px]">
                                {(critere.suggestions.find(s => s.isSelectedByUser) || critere.suggestions.find(s => s.isBestMatch) || critere.suggestions[0])?.label}
                                {/* Badge non pertinent si score < 50% */}
                                {(() => {
                                  const mainSuggestion = critere.suggestions.find(s => s.isSelectedByUser) || critere.suggestions.find(s => s.isBestMatch) || critere.suggestions[0]
                                  if (mainSuggestion && mainSuggestion.similarityScore < 50) {
                                    return <span className="ml-2 text-xs text-red-600 font-semibold">Non pertinent</span>
                                  }
                                  return null
                                })()}
                              </span>
                              <div className="flex items-center gap-1">
                                {critere.suggestions.find(s => s.isSelectedByUser) && <Badge variant="outline" className="text-xs px-1 py-0">Selected</Badge>}
                                {!critere.suggestions.find(s => s.isSelectedByUser) && critere.suggestions.find(s => s.isBestMatch) && <Badge variant="default" className="text-xs px-1 py-0">Best</Badge>}
                                <span className="text-xs">▼</span>
                              </div>
                            </div>
                            {critere.suggestions.length > 1 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {critere.suggestions.length} suggestions disponibles
                              </div>
                            )}
                          </div>

                          {/* Dropdown avec toutes les suggestions */}
                          {openDropdowns[critere.id] && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                              {critere.suggestions.map((suggestion, index) => {
                                // Détermination de la pertinence basée sur le score
                                const isHighQuality = suggestion.similarityScore >= 60
                                const isMediumQuality = suggestion.similarityScore >= 30
                                const isLowQuality = suggestion.similarityScore < 30
                                
                                return (
                                  <div
                                    key={suggestion.id}
                                    className={`p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${
                                      suggestion.isSelectedByUser ? 'bg-blue-50' : suggestion.isBestMatch ? 'bg-green-50' : ''
                                    } ${isLowQuality ? 'opacity-60' : ''}`}
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
                                          {isHighQuality && <div className="w-2 h-2 bg-green-500 rounded-full" title="Haute qualité"></div>}
                                          {isMediumQuality && !isHighQuality && <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Qualité moyenne"></div>}
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
                                        {suggestion.isBestMatch && <Badge variant="default" className="text-xs px-1 py-0">Best</Badge>}
                                        {isLowQuality && <Badge variant="destructive" className="text-xs px-1 py-0">Low</Badge>}
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
                      {critere.suggestions && critere.suggestions.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="font-mono text-sm">
                            {(critere.suggestions.find(s => s.isSelectedByUser) || critere.suggestions.find(s => s.isBestMatch) || critere.suggestions[0])?.similarityScore}%
                          </div>
                          {(() => {
                            const currentSuggestion = critere.suggestions.find(s => s.isSelectedByUser) || critere.suggestions.find(s => s.isBestMatch) || critere.suggestions[0]
                            if (!currentSuggestion) return null
                            const score = currentSuggestion.similarityScore
                            return <div className={`w-2 h-2 rounded-full ${score >= 50 ? 'bg-green-500' : 'bg-red-500'}`} title={score >= 50 ? 'Pertinent' : 'Non pertinent'}></div>
                          })()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    {/* Colonne Audience */}
                    <td className="px-2 py-2">
                      {critere.suggestions && critere.suggestions.length > 0 ? (
                        <div className="font-mono text-sm">
                          {formatAudience((critere.suggestions.find(s => s.isSelectedByUser) || critere.suggestions.find(s => s.isBestMatch) || critere.suggestions[0])?.audience || 0)}
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
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-4 text-muted-foreground">No criteria found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectResults 