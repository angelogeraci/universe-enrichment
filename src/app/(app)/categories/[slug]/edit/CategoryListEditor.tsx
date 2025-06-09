"use client"
import React, { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'

// TODO: Permettre de modifier le nom d'une liste de catégories (comme sur les projets)
// TODO: Permettre d'éditer une catégorie (nom, path associé, critère AND)

export default function CategoryListEditor({ slug }: { slug: string }) {
  const [name, setName] = useState('')
  const [paths, setPaths] = useState([''])
  const [andCriteria, setAndCriteria] = useState<string[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch categories
  const fetchCategories = () => {
    setLoading(true)
    setError(null)
    fetch(`/api/categories/slug/${slug}`)
      .then(res => res.json())
      .then(data => setCategories(data.categories || []))
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchCategories()
  }, [slug])

  // Handlers for dynamic fields
  const handlePathChange = (i: number, value: string) => {
    setPaths(paths => paths.map((p, idx) => idx === i ? value : p))
  }
  const addPath = () => setPaths(paths => [...paths, ''])
  const removePath = (i: number) => setPaths(paths => paths.filter((_, idx) => idx !== i))

  const handleAndChange = (i: number, value: string) => {
    setAndCriteria(arr => arr.map((c, idx) => idx === i ? value : c))
  }
  const addAnd = () => setAndCriteria(arr => [...arr, ''])
  const removeAnd = (i: number) => setAndCriteria(arr => arr.filter((_, idx) => idx !== i))

  // Add category
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setError(null)
    try {
      const res = await fetch(`/api/categories/slug/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, paths: paths.filter(Boolean), andCriteria: andCriteria.filter(Boolean) })
      })
      if (!res.ok) throw new Error('Erreur lors de l\'ajout')
      setName('')
      setPaths([''])
      setAndCriteria([])
      // Refresh categories
      await fetchCategories()
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue')
    } finally {
      setAdding(false)
    }
  }

  // Delete single category
  const handleDeleteCategory = async (id: string, categoryName: string) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/categories/slug/${slug}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      // Rafraîchir la liste des catégories
      await fetchCategories()
      setSelectedItems(new Set())
    } catch (error) {
      console.error('Erreur lors de la suppression de la catégorie:', error)
      setError('Erreur lors de la suppression de la catégorie')
    } finally {
      setDeletingId(null)
    }
  }

  // Delete selected categories
  const handleDeleteSelected = async () => {
    const selectedIds = Array.from(selectedItems)
    
    try {
      const response = await fetch(`/api/categories/slug/${slug}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: selectedIds })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }
      
      // Rafraîchir la liste et réinitialiser la sélection
      await fetchCategories()
      setSelectedItems(new Set())
    } catch (error) {
      console.error('Erreur lors de la suppression des catégories:', error)
      setError('Erreur lors de la suppression des catégories')
    }
  }

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedItems.size === categories.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(categories.map(cat => cat.id)))
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleAdd} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Nom de la catégorie</label>
          <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Nom" />
        </div>
        <div>
          <label className="block font-medium mb-1">Paths</label>
          {paths.map((path, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Input value={path} onChange={e => handlePathChange(i, e.target.value)} required placeholder={`Path #${i+1}`} />
              {paths.length > 1 && <Button type="button" variant="destructive" size="icon" onClick={() => removePath(i)}>-</Button>}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addPath}>Ajouter un path</Button>
        </div>
        <div>
          <label className="block font-medium mb-1">Critères AND (optionnel)</label>
          {andCriteria.map((crit, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Input value={crit} onChange={e => handleAndChange(i, e.target.value)} placeholder={`Critère #${i+1}`} />
              <Button type="button" variant="destructive" size="icon" onClick={() => removeAnd(i)}>-</Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addAnd}>Ajouter un critère</Button>
        </div>
        {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
        <Button type="submit" disabled={adding || !name || !paths.filter(Boolean).length}>
          {adding ? 'Ajout...' : 'Ajouter la catégorie'}
        </Button>
      </form>

      <div>
        <h2 className="text-lg font-semibold mb-4">Catégories de la liste</h2>
        
        {/* Sélection groupée */}
        {selectedItems.size > 0 && (
          <div className="mb-4">
            <DeleteConfirmModal
              title={`Supprimer ${selectedItems.size} catégorie(s)`}
              description={`Cette action supprimera définitivement ${selectedItems.size} catégorie(s) sélectionnée(s). Cette action est irréversible.`}
              onConfirm={handleDeleteSelected}
            >
              <Button variant="destructive" size="sm">
                Supprimer la sélection ({selectedItems.size})
              </Button>
            </DeleteConfirmModal>
          </div>
        )}

        {loading ? (
          <div>Chargement...</div>
        ) : categories.length === 0 ? (
          <div>Aucune catégorie.</div>
        ) : (
          <div className="rounded-lg border bg-background w-full">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="w-12 px-3 py-2 text-left font-semibold">
                    <Checkbox
                      checked={selectedItems.size === categories.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Sélectionner tout"
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">Nom</th>
                  <th className="px-3 py-2 text-left font-semibold">Path</th>
                  <th className="px-3 py-2 text-left font-semibold">Critères AND</th>
                  <th className="px-3 py-2 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-b last:border-b-0 hover:bg-muted/40">
                    <td className="px-3 py-2 align-middle">
                      <Checkbox
                        checked={selectedItems.has(cat.id)}
                        onCheckedChange={() => toggleSelection(cat.id)}
                        aria-label="Sélectionner la ligne"
                      />
                    </td>
                    <td className="px-3 py-2 align-middle">{cat.name}</td>
                    <td className="px-3 py-2 align-middle">{cat.path}</td>
                    <td className="px-3 py-2 align-middle">{cat.andCriteria?.join(', ')}</td>
                    <td className="px-3 py-2 align-middle">
                      <DeleteConfirmModal
                        title={`Supprimer la catégorie "${cat.name}"`}
                        description="Cette action est irréversible. Cette catégorie sera définitivement supprimée."
                        onConfirm={() => handleDeleteCategory(cat.id, cat.name)}
                        isLoading={deletingId === cat.id}
                      >
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          disabled={deletingId === cat.id}
                        >
                          {deletingId === cat.id ? "Suppression..." : "Supprimer"}
                        </Button>
                      </DeleteConfirmModal>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
} 