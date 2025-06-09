'use client'

import React, { useMemo, useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'
import { Badge } from './ui/badge'

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

export function ProjectResults ({
  isComplete = false,
  metrics = {
    aiCriteria: 0,
    withFacebook: 0,
    valid: 0
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
  criteriaData = []
}: {
  isComplete?: boolean
  metrics?: { aiCriteria: number, withFacebook: number, valid: number }
  progress?: { current: number, total: number, step: string, errors: number, eta: string }
  onlyMetrics?: boolean
  onlyProgress?: boolean
  criteriaData?: Critere[]
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'label' | 'category' | 'status'>('label')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Filtrage et tri
  const filtered = useMemo(() => {
    let data = criteriaData
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
  }, [criteriaData, search, sortBy, sortDir])

  const toggleSelect = (id: string) => {
    setSelected(sel => sel.includes(id) ? sel.filter(s => s !== id) : [...sel, id])
  }
  const selectAll = () => setSelected(filtered.map(c => c.id))
  const deselectAll = () => setSelected([])

  // Ref pour la checkbox "select all" (Radix UI = bouton)
  const selectAllRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (selectAllRef.current) {
      // Radix UI Checkbox est un bouton, l'input réel est dans le shadow DOM
      const input = selectAllRef.current.querySelector('input[type="checkbox"]') as HTMLInputElement | null
      if (input) {
        input.indeterminate = selected.length > 0 && selected.length < filtered.length
      }
    }
  }, [selected, filtered])

  // Mode spécial onlyMetrics pour rétrocompatibilité
  if (onlyMetrics) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle>AI criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{metrics.aiCriteria}</div>
            <div className="text-muted-foreground text-sm mt-1">Proposed by AI</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>With Facebook suggestion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{metrics.withFacebook}</div>
            <div className="text-muted-foreground text-sm mt-1">With at least one Facebook match</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Valid criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{metrics.valid}</div>
            <div className="text-muted-foreground text-sm mt-1">Score &gt; 80</div>
          </CardContent>
        </Card>
      </>
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
          <div className="w-full bg-white rounded-lg border p-4 mt-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
              <Input
                placeholder="Search criteria..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full md:w-64"
              />
              <div className="flex gap-2 mt-2 md:mt-0">
                <Button size="sm" variant="outline" onClick={selectAll}>Select all</Button>
                <Button size="sm" variant="outline" onClick={deselectAll}>Deselect all</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-2">
                      <Checkbox
                        ref={selectAllRef}
                        checked={selected.length === filtered.length && filtered.length > 0}
                        onCheckedChange={v => v ? selectAll() : deselectAll()}
                      />
                    </th>
                    <th className="px-2 py-2 cursor-pointer" onClick={() => setSortBy('label')}>Label {sortBy === 'label' && (sortDir === 'asc' ? '▲' : '▼')}</th>
                    <th className="px-2 py-2 cursor-pointer" onClick={() => setSortBy('category')}>Category {sortBy === 'category' && (sortDir === 'asc' ? '▲' : '▼')}</th>
                    <th className="px-2 py-2 cursor-pointer" onClick={() => setSortBy('status')}>Status {sortBy === 'status' && (sortDir === 'asc' ? '▲' : '▼')}</th>
                    <th className="px-2 py-2">Facebook Suggestions</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(critere => (
                    <tr key={critere.id} className={selected.includes(critere.id) ? 'bg-blue-50' : ''}>
                      <td className="px-2 py-2"><Checkbox checked={selected.includes(critere.id)} onCheckedChange={() => toggleSelect(critere.id)} /></td>
                      <td className="px-2 py-2 font-medium">{critere.label}</td>
                      <td className="px-2 py-2">{critere.category}</td>
                      <td className="px-2 py-2">
                        <Badge variant={critere.status === 'valid' ? 'default' : critere.status === 'pending' ? 'secondary' : 'secondary'}>{critere.status}</Badge>
                      </td>
                      <td className="px-2 py-2">
                        {critere.suggestions && critere.suggestions.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {critere.suggestions.map(s => (
                              <span key={s.id} className={s.isBestMatch ? 'font-bold text-green-700' : ''}>
                                {s.label} <span className="text-xs text-muted-foreground">({s.audience})</span> {s.isBestMatch && <Badge variant="default">Best</Badge>}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No suggestion</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <Button size="sm" variant="outline">Edit</Button>
                        <Button size="sm" variant="destructive" className="ml-2">Delete</Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-4 text-muted-foreground">No criteria found.</td></tr>
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
      <div className="w-full flex flex-col md:flex-row gap-4">
        <Card>
          <CardHeader>
            <CardTitle>AI criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{metrics.aiCriteria}</div>
            <div className="text-muted-foreground text-sm mt-1">Proposed by AI</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>With Facebook suggestion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{metrics.withFacebook}</div>
            <div className="text-muted-foreground text-sm mt-1">With at least one Facebook match</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Valid criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{metrics.valid}</div>
            <div className="text-muted-foreground text-sm mt-1">Score &gt; 80</div>
          </CardContent>
        </Card>
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
        <div className="w-full bg-white rounded-lg border p-4 mt-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <Input
              placeholder="Search criteria..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full md:w-64"
            />
            <div className="flex gap-2 mt-2 md:mt-0">
              <Button size="sm" variant="outline" onClick={selectAll}>Select all</Button>
              <Button size="sm" variant="outline" onClick={deselectAll}>Deselect all</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-2 py-2">
                    <Checkbox
                      ref={selectAllRef}
                      checked={selected.length === filtered.length && filtered.length > 0}
                      onCheckedChange={v => v ? selectAll() : deselectAll()}
                    />
                  </th>
                  <th className="px-2 py-2 cursor-pointer" onClick={() => setSortBy('label')}>Label {sortBy === 'label' && (sortDir === 'asc' ? '▲' : '▼')}</th>
                  <th className="px-2 py-2 cursor-pointer" onClick={() => setSortBy('category')}>Category {sortBy === 'category' && (sortDir === 'asc' ? '▲' : '▼')}</th>
                  <th className="px-2 py-2 cursor-pointer" onClick={() => setSortBy('status')}>Status {sortBy === 'status' && (sortDir === 'asc' ? '▲' : '▼')}</th>
                  <th className="px-2 py-2">Facebook Suggestions</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(critere => (
                  <tr key={critere.id} className={selected.includes(critere.id) ? 'bg-blue-50' : ''}>
                    <td className="px-2 py-2"><Checkbox checked={selected.includes(critere.id)} onCheckedChange={() => toggleSelect(critere.id)} /></td>
                    <td className="px-2 py-2 font-medium">{critere.label}</td>
                    <td className="px-2 py-2">{critere.category}</td>
                    <td className="px-2 py-2">
                      <Badge variant={critere.status === 'valid' ? 'default' : critere.status === 'pending' ? 'secondary' : 'secondary'}>{critere.status}</Badge>
                    </td>
                    <td className="px-2 py-2">
                      {critere.suggestions && critere.suggestions.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {critere.suggestions.map(s => (
                            <span key={s.id} className={s.isBestMatch ? 'font-bold text-green-700' : ''}>
                              {s.label} <span className="text-xs text-muted-foreground">({s.audience})</span> {s.isBestMatch && <Badge variant="default">Best</Badge>}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No suggestion</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <Button size="sm" variant="outline">Edit</Button>
                      <Button size="sm" variant="destructive" className="ml-2">Delete</Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-4 text-muted-foreground">No criteria found.</td></tr>
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