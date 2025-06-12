"use client"

import React, { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  RowSelectionState,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import CreateProjectModal, { Project } from "@/components/CreateProjectModal"
import DeleteConfirmModal from "@/components/DeleteConfirmModal"
import StatusTag from '@/components/StatusTag'
import { useToast } from '@/hooks/useToast'

// --- Mock data type ---
export type { Project } from "@/components/CreateProjectModal"

const mockProjects: Project[] = [
  {
    id: "1",
    country: "FR",
    countryFlag: "🇫🇷",
    name: "Projet France",
    description: "Analyse du marché français.",
    criteriaMatchCount: 5,
    progressStatus: "ready",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    country: "US",
    countryFlag: "🇺🇸",
    name: "Projet USA",
    description: "Campagne publicitaire US.",
    criteriaMatchCount: 3,
    progressStatus: "in_progress",
    createdAt: new Date().toISOString(),
  },
]

const statusLabel: Record<Project["progressStatus"], string> = {
  error: "Erreur",
  in_progress: "En cours",
  ready: "Prêt",
}
const statusColor: Record<Project["progressStatus"], string> = {
  error: "bg-red-100 text-red-700",
  in_progress: "bg-yellow-100 text-yellow-800",
  ready: "bg-green-100 text-green-700",
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { success, error: showError, warning } = useToast()

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/projects')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors du chargement des projets')
      }
      
      const data = await response.json()
      setProjects(data.projects || [])
      setError('')
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du chargement des projets'
      setError(errorMessage)
      showError(errorMessage, { duration: 6000 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  // Fonction pour supprimer un projet individuel avec confirmation
  const handleDeleteProject = async (projectId: string, projectName: string) => {
    setDeletingId(projectId)
    try {
      const response = await fetch(`/api/projects/id/${projectId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erreur lors de la suppression du projet "${projectName}"`)
      }
      
      success(`Projet "${projectName}" supprimé avec succès`, { duration: 4000 })
      await fetchProjects()
    } catch (error: any) {
      console.error('Erreur lors de la suppression du projet:', error)
      showError(error.message || `Erreur lors de la suppression du projet "${projectName}"`, { duration: 6000 })
    } finally {
      setDeletingId(null)
    }
  }

  // Fonction pour supprimer les projets sélectionnés avec confirmation
  const handleDeleteSelected = async () => {
    const selectedRowIndexes = Object.keys(rowSelection)
    const selectedProjectIds = selectedRowIndexes.map(index => projects[parseInt(index)].id)
    const selectedCount = selectedProjectIds.length
    
    try {
      let successCount = 0
      let failedCount = 0
      
      for (const projectId of selectedProjectIds) {
        try {
          const response = await fetch(`/api/projects/id/${projectId}`, {
            method: 'DELETE',
          })
          if (!response.ok) {
            failedCount++
          } else {
            successCount++
          }
        } catch {
          failedCount++
        }
      }
      
      // Messages de résultat
      if (successCount > 0 && failedCount === 0) {
        success(`${successCount} projet(s) supprimé(s) avec succès`, { duration: 4000 })
      } else if (successCount > 0 && failedCount > 0) {
        warning(`${successCount} projet(s) supprimé(s), ${failedCount} échec(s)`, { duration: 5000 })
      } else {
        showError(`Échec de la suppression des ${selectedCount} projet(s)`, { duration: 6000 })
      }
      
      // Rafraîchir la liste et réinitialiser la sélection
      await fetchProjects()
      setRowSelection({})
    } catch (error) {
      console.error('Erreur lors de la suppression des projets:', error)
      showError('Erreur lors de la suppression des projets sélectionnés', { duration: 6000 })
    }
  }

  const columnHelper = createColumnHelper<Project>()
  const columns = useMemo(() => [
    columnHelper.display({
      id: "select",
      header: ({ table }) => (
        <div className="pr-0 flex justify-center items-center" style={{ width: 42 }}>
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            onCheckedChange={value => table.toggleAllRowsSelected(!!value)}
            aria-label="Sélectionner tout"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="pr-0 flex justify-center items-center" style={{ width: 42 }}>
          <Checkbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onCheckedChange={value => row.toggleSelected(!!value)}
            aria-label="Sélectionner la ligne"
          />
        </div>
      ),
      size: 42,
    }),
    columnHelper.accessor("countryFlag", {
      header: "Pays",
      cell: info => <span className="text-lg">{info.getValue()}</span>,
      size: 48,
    }),
    columnHelper.accessor("name", {
      header: "Nom du projet",
      cell: info => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="text-blue-600 hover:underline font-medium text-left w-full truncate min-w-[120px] pl-0"
                style={{ flex: 1, minWidth: 0 }}
                onClick={() => router.push(`/projects/${info.row.original.slug || info.row.original.id}`)}
                tabIndex={0}
                type="button"
              >
                {info.getValue()}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {info.row.original.description}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      size: 1,
    }),
    columnHelper.accessor("createdAt", {
      header: "Date",
      cell: info => format(new Date(info.getValue()), "dd/MM/yyyy"),
      size: 1,
    }),
    columnHelper.accessor('enrichmentStatus', {
      header: 'Status',
      cell: info => <StatusTag status={info.getValue() as 'pending' | 'done'} />,
      size: 1,
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <CreateProjectModal 
            project={row.original}
            onProjectCreated={fetchProjects}
          >
            <Button variant="outline" size="sm">
              Éditer
            </Button>
          </CreateProjectModal>
          <DeleteConfirmModal
            title={`Supprimer le projet "${row.original.name}"`}
            description="Cette action est irréversible. Toutes les données associées à ce projet seront définitivement supprimées."
            onConfirm={() => handleDeleteProject(row.original.id, row.original.name)}
            isLoading={deletingId === row.original.id}
          >
            <Button 
              variant="outline" 
              size="sm" 
              disabled={deletingId === row.original.id}
            >
              {deletingId === row.original.id ? "Suppression..." : "Supprimer"}
            </Button>
          </DeleteConfirmModal>
        </div>
      ),
      size: 1,
    }),
  ], [router])

  const table = useReactTable({
    data: projects,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
  })

  return (
    <div className="w-full px-32 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mes projets</h1>
        <CreateProjectModal onProjectCreated={fetchProjects}>
          <Button>Nouveau projet</Button>
        </CreateProjectModal>
      </div>
      {loading && <div>Chargement des projets...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <>
          {/* Sélection groupée */}
          {Object.keys(rowSelection).length > 0 && (
            <DeleteConfirmModal
              title={`Supprimer ${Object.keys(rowSelection).length} projet(s)`}
              description={`Cette action supprimera définitivement ${Object.keys(rowSelection).length} projet(s) sélectionné(s). Cette action est irréversible.`}
              onConfirm={handleDeleteSelected}
            >
              <Button variant="destructive" size="sm">
                Supprimer la sélection ({Object.keys(rowSelection).length})
              </Button>
            </DeleteConfirmModal>
          )}

          {/* Tableau */}
          <div className="rounded-lg border bg-background w-full">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '42px' }} />
                <col style={{ width: '48px' }} />
                <col style={{ width: '40%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '18%' }} />
              </colgroup>
              <thead className="bg-muted">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header, i) => (
                      <th
                        key={header.id}
                        className={
                          header.id === 'select'
                            ? 'pr-0 py-2 text-left font-semibold'
                            : header.id === 'countryFlag'
                              ? 'px-0 py-2 text-left font-semibold'
                              : header.id === 'name'
                                ? 'pl-0 py-2 text-left font-semibold'
                                : 'px-3 py-2 text-left font-semibold'
                        }
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/40">
                    {row.getVisibleCells().map((cell, i) => (
                      <td
                        key={cell.id}
                        className={
                          cell.column.id === 'select'
                            ? 'pr-0 py-2 align-middle'
                            : cell.column.id === 'countryFlag'
                              ? 'px-0 py-2 align-middle'
                              : cell.column.id === 'name'
                                ? 'pl-0 py-2 align-middle'
                                : 'px-3 py-2 align-middle'
                        }
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
} 