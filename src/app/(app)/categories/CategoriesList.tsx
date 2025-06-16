"use client"

import React, { useEffect, useState, forwardRef, useImperativeHandle, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import DeleteConfirmModal from "@/components/DeleteConfirmModal"
import { Pagination } from "@/components/ui/pagination"
import { Edit, Trash2 } from "lucide-react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  RowSelectionState,
  PaginationState,
} from "@tanstack/react-table"

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
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  })
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
      setRowSelection({})
    } catch (error) {
      console.error('Erreur lors de la suppression de la catégorie:', error)
      alert('Erreur lors de la suppression de la catégorie')
    } finally {
      setDeletingSlug(null)
    }
  }

  // Fonction pour supprimer les catégories sélectionnées avec confirmation
  const handleDeleteSelected = async () => {
    const selectedIndices = Object.keys(rowSelection).filter(key => rowSelection[key])
    const selectedSlugs = selectedIndices.map(index => lists[parseInt(index)].slug)
    
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
      setRowSelection({})
    } catch (error) {
      console.error('Erreur lors de la suppression des catégories:', error)
      alert('Erreur lors de la suppression des catégories')
    }
  }

  // Configuration des colonnes TanStack Table
  const columnHelper = createColumnHelper<CategoryList>()
  
  const columns = useMemo(() => [
    columnHelper.display({
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 50,
    }),
    columnHelper.accessor("name", {
      header: "List name",
      cell: info => (
        <button
          className="text-blue-600 hover:underline font-medium text-left w-full"
          onClick={() => router.push(`/categories/${info.row.original.slug}/edit`)}
        >
          {info.getValue()}
        </button>
      ),
      size: 250,
    }),
    columnHelper.accessor("categories", {
      header: "Categories",
      cell: info => (
        <span className="text-sm text-muted-foreground">
          {info.getValue().length} categor{info.getValue().length > 1 ? 'ies' : 'y'}
        </span>
      ),
      size: 120,
    }),
    columnHelper.accessor("isPublic", {
      header: "Visibility",
      cell: info => (
        <Badge variant={info.getValue() ? "default" : "secondary"}>
          {info.getValue() ? "Public" : "Private"}
        </Badge>
      ),
      size: 120,
    }),
    columnHelper.accessor("createdAt", {
      header: "Created at",
      cell: info => format(new Date(info.getValue()), "dd/MM/yyyy"),
      size: 120,
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button 
            size="icon" 
            variant="outline"
            onClick={() => router.push(`/categories/${row.original.slug}/edit`)}
            title="Edit"
          >
            <Edit size={18} />
          </Button>
          <DeleteConfirmModal
            title={`Supprimer la liste "${row.original.name}"`}
            description="Cette action est irréversible. Toutes les catégories de cette liste seront définitivement supprimées."
            onConfirm={() => handleDeleteCategory(row.original.slug, row.original.name)}
            isLoading={deletingSlug === row.original.slug}
          >
            <Button 
              size="icon"
              variant="destructive" 
              disabled={deletingSlug === row.original.slug}
              title="Delete"
            >
              <Trash2 size={18} />
            </Button>
          </DeleteConfirmModal>
        </div>
      ),
      enableSorting: false,
      size: 120,
    }),
  ], [router, deletingSlug])

  // Configuration du tableau TanStack Table
  const table = useReactTable({
    data: lists,
    columns,
    state: {
      rowSelection,
      pagination,
    },
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
  })

  useImperativeHandle(ref, () => ({ reload: fetchLists }), [])

  useEffect(() => {
    fetchLists()
  }, [])

  if (loading) return <div>Loading category lists...</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (!lists.length) return <div>No category lists.</div>

  const selectedCount = Object.keys(rowSelection).filter(key => rowSelection[key]).length

  return (
    <div className="w-full">
      {/* Sélection groupée */}
      {selectedCount > 0 && (
        <div className="mb-4">
          <DeleteConfirmModal
            title={`Delete ${selectedCount} category list(s)`}
            description={`This will permanently delete ${selectedCount} selected category list(s) and all their categories. This action is irreversible.`}
            onConfirm={handleDeleteSelected}
          >
            <Button variant="destructive" size="sm">
              Delete selection ({selectedCount})
            </Button>
          </DeleteConfirmModal>
        </div>
      )}

      {/* Tableau */}
      <div className="rounded-lg border bg-background w-full">
        <table className="w-full text-sm">
          <colgroup>
            <col style={{ width: '50px' }} />
            <col style={{ width: '250px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '120px' }} />
          </colgroup>
          <thead className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 text-left font-semibold">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/40">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <Pagination
        table={table}
        totalItems={lists.length}
      />
    </div>
  )
})

export default CategoriesList 