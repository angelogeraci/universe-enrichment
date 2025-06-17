"use client"

import React, { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { Edit, Trash2, Eye } from "lucide-react"
import CreateProjectModal, { Project } from "@/components/CreateProjectModal"
import DeleteConfirmModal from "@/components/DeleteConfirmModal"
import StatusTag from '@/components/StatusTag'
import { useToast } from '@/hooks/useToast'
import { Pagination } from "@/components/ui/pagination"

// --- Mock data type ---
export type { Project } from "@/components/CreateProjectModal"

const mockProjects: Project[] = [
  {
    id: "1",
    country: "FR",
    countryFlag: "🇫🇷",
    name: "France Project",
    description: "French market analysis.",
    criteriaMatchCount: 5,
    validCriteriaCount: 3,
    progressStatus: "ready",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    country: "US",
    countryFlag: "🇺🇸",
    name: "USA Project",
    description: "US advertising campaign.",
    criteriaMatchCount: 3,
    validCriteriaCount: 2,
    progressStatus: "in_progress",
    createdAt: new Date().toISOString(),
  },
]

const statusLabel: Record<Project["progressStatus"], string> = {
  error: "Error",
  in_progress: "In Progress",
  ready: "Ready",
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
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  })
  const { success, error: showError, warning } = useToast()

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/projects')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error loading projects')
      }
      
      const data = await response.json()
      setProjects(data.projects || [])
      setError('')
    } catch (err: any) {
      const errorMessage = err.message || 'Error loading projects'
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
        throw new Error(errorData.error || `Error deleting project "${projectName}"`)
      }
      
      success(`Project "${projectName}" deleted successfully`, { duration: 4000 })
      await fetchProjects()
    } catch (error: any) {
      console.error('Error deleting project:', error)
      showError(error.message || `Error deleting project "${projectName}"`, { duration: 6000 })
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
        success(`${successCount} project(s) deleted successfully`, { duration: 4000 })
      } else if (successCount > 0 && failedCount > 0) {
        warning(`${successCount} project(s) deleted, ${failedCount} failed`, { duration: 5000 })
      } else {
        showError(`Failed to delete ${selectedCount} project(s)`, { duration: 6000 })
      }
      
      // Rafraîchir la liste et réinitialiser la sélection
      await fetchProjects()
      setRowSelection({})
    } catch (error) {
      console.error('Error deleting projects:', error)
      showError('Error deleting selected projects', { duration: 6000 })
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
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="pr-0 flex justify-center items-center" style={{ width: 42 }}>
          <Checkbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onCheckedChange={value => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      size: 42,
    }),
    columnHelper.accessor("countryFlag", {
      header: "Country",
      cell: info => <span className="text-lg">{info.getValue()}</span>,
      size: 80,
    }),
    columnHelper.accessor("name", {
      header: "Project Name",
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
      size: 250,
    }),
    columnHelper.accessor("validCriteriaCount", {
      header: "Valid Criteria",
      cell: info => (
        <span className="font-medium text-green-700 ml-4">
          {info.getValue() || 0}
        </span>
      ),
      size: 110,
    }),
    columnHelper.accessor("createdAt", {
      header: "Date",
      cell: info => format(new Date(info.getValue()), "MM/dd/yyyy"),
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
        <div className="flex gap-2">
          <Button 
            size="icon" 
            variant="outline"
            onClick={() => router.push(`/projects/${row.original.slug || row.original.id}`)}
            title="View"
          >
            <Eye size={18} />
          </Button>
          <CreateProjectModal 
            project={row.original}
            mode="edit"
            onProjectCreated={fetchProjects}
          >
            <Button 
              size="icon" 
              variant="outline"
              title="Edit"
            >
              <Edit size={18} />
            </Button>
          </CreateProjectModal>
          <DeleteConfirmModal
            title="Delete Project"
            description={`Are you sure you want to delete the project "${row.original.name}"? This action cannot be undone.`}
            onConfirm={() => handleDeleteProject(row.original.id, row.original.name)}
            isLoading={deletingId === row.original.id}
          >
            <Button 
              size="icon"
              variant="destructive" 
              disabled={deletingId === row.original.id}
              title="Delete"
            >
              <Trash2 size={18} />
            </Button>
          </DeleteConfirmModal>
        </div>
      ),
      size: 1,
    }),
  ], [router, handleDeleteProject, fetchProjects, deletingId])

  const table = useReactTable({
    data: projects,
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

  return (
    <div className="w-full px-32 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Projects</h1>
        <CreateProjectModal onProjectCreated={fetchProjects}>
          <Button>New Project</Button>
        </CreateProjectModal>
      </div>
      {loading && <div>Loading projects...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <>
          {/* Sélection groupée */}
          {Object.keys(rowSelection).length > 0 && (
            <DeleteConfirmModal
              title={`Delete ${Object.keys(rowSelection).length} project(s)`}
              description={`This action will permanently delete ${Object.keys(rowSelection).length} selected project(s). This action cannot be undone.`}
              onConfirm={handleDeleteSelected}
            >
              <Button variant="destructive" size="sm">
                Delete Selection ({Object.keys(rowSelection).length})
              </Button>
            </DeleteConfirmModal>
          )}

          {/* Tableau */}
          <div className="rounded-lg border bg-background w-full">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '42px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '140px' }} />
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

          {/* Pagination et contrôles */}
          <Pagination
            table={table}
            totalItems={projects.length}
          />
        </>
      )}
    </div>
  )
} 