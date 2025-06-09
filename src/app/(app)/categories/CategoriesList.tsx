"use client"

import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import DeleteConfirmModal from "@/components/DeleteConfirmModal"

export type CategoryList = {
  id: string
  name: string
  createdAt: string
  isPublic: boolean
  owner: { firstName?: string; lastName?: string; email: string }
  categories: { id: string }[]
  slug: string
}

const CategoriesList = forwardRef(function CategoriesList(_, ref) {
  const [lists, setLists] = useState<CategoryList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)
  const router = useRouter()

  const fetchLists = () => {
    setLoading(true)
    setError(null)
    fetch("/api/categories")
      .then(async (res) => {
        if (!res.ok) throw new Error("Error loading category lists")
        return res.json()
      })
      .then((data) => setLists(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  // Fonction pour supprimer une catégorie avec confirmation
  const handleDeleteCategory = async (slug: string, categoryName: string) => {
    setDeletingSlug(slug)
    try {
      const response = await fetch(`/api/categories/slug/${slug}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      // Rafraîchir la liste des catégories
      await fetchLists()
      setSelectedItems(new Set())
    } catch (error) {
      console.error('Erreur lors de la suppression de la catégorie:', error)
      alert('Erreur lors de la suppression de la catégorie')
    } finally {
      setDeletingSlug(null)
    }
  }

  // Fonction pour supprimer les catégories sélectionnées avec confirmation
  const handleDeleteSelected = async () => {
    const selectedSlugs = Array.from(selectedItems)
    
    try {
      for (const slug of selectedSlugs) {
        const response = await fetch(`/api/categories/slug/${slug}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error(`Erreur lors de la suppression de la catégorie ${slug}`)
        }
      }
      
      // Rafraîchir la liste et réinitialiser la sélection
      await fetchLists()
      setSelectedItems(new Set())
    } catch (error) {
      console.error('Erreur lors de la suppression des catégories:', error)
      alert('Erreur lors de la suppression des catégories')
    }
  }

  const toggleSelection = (slug: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(slug)) {
      newSelected.delete(slug)
    } else {
      newSelected.add(slug)
    }
    setSelectedItems(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedItems.size === lists.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(lists.map(list => list.slug)))
    }
  }

  useImperativeHandle(ref, () => ({ reload: fetchLists }), [])

  useEffect(() => {
    fetchLists()
  }, [])

  if (loading) return <div>Loading category lists...</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (!lists.length) return <div>No category lists.</div>

  return (
    <div className="w-full">
      {/* Sélection groupée */}
      {selectedItems.size > 0 && (
        <div className="mb-4">
          <DeleteConfirmModal
            title={`Delete ${selectedItems.size} category list(s)`}
            description={`This will permanently delete ${selectedItems.size} selected category list(s) and all their categories. This action is irreversible.`}
            onConfirm={handleDeleteSelected}
          >
            <Button variant="destructive" size="sm">
              Delete selection ({selectedItems.size})
            </Button>
          </DeleteConfirmModal>
        </div>
      )}

      {/* Tableau */}
      <div className="rounded-lg border bg-background w-full">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="w-12 px-3 py-2 text-left font-semibold">
                <Checkbox
                  checked={selectedItems.size === lists.length}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Sélectionner tout"
                />
              </th>
              <th className="px-3 py-2 text-left font-semibold">List name</th>
              <th className="px-3 py-2 text-left font-semibold">Categories</th>
              <th className="px-3 py-2 text-left font-semibold">Visibility</th>
              <th className="px-3 py-2 text-left font-semibold">Created at</th>
              <th className="px-3 py-2 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lists.map((list) => (
              <tr key={list.slug} className="border-b last:border-b-0 hover:bg-muted/40">
                <td className="px-3 py-2 align-middle">
                  <Checkbox
                    checked={selectedItems.has(list.slug)}
                    onCheckedChange={() => toggleSelection(list.slug)}
                    aria-label="Sélectionner la ligne"
                  />
                </td>
                <td className="px-3 py-2 align-middle">
                  <button
                    className="text-blue-600 hover:underline font-medium text-left w-full"
                    onClick={() => router.push(`/categories/${list.slug}/edit`)}
                  >
                    {list.name}
                  </button>
                </td>
                <td className="px-3 py-2 align-middle">
                  <span className="text-sm text-muted-foreground">
                    {list.categories.length} categor{list.categories.length > 1 ? 'ies' : 'y'}
                  </span>
                </td>
                <td className="px-3 py-2 align-middle">
                  <Badge variant={list.isPublic ? "default" : "secondary"}>
                    {list.isPublic ? "Public" : "Private"}
                  </Badge>
                </td>
                <td className="px-3 py-2 align-middle">
                  {format(new Date(list.createdAt), "dd/MM/yyyy")}
                </td>
                <td className="px-3 py-2 align-middle">
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/categories/${list.slug}/edit`)}
                    >
                      Edit
                    </Button>
                    <DeleteConfirmModal
                      title={`Supprimer la liste "${list.name}"`}
                      description="Cette action est irréversible. Toutes les catégories de cette liste seront définitivement supprimées."
                      onConfirm={() => handleDeleteCategory(list.slug, list.name)}
                      isLoading={deletingSlug === list.slug}
                    >
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        disabled={deletingSlug === list.slug}
                      >
                        {deletingSlug === list.slug ? "Suppression..." : "Supprimer"}
                      </Button>
                    </DeleteConfirmModal>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
})

export default CategoriesList 