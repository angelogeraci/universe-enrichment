"use client"

import React, { useMemo, useState } from "react"
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

// --- Modal de création de projet ---
function CreateProjectModal({ open, onClose, onCreate }: { open: boolean, onClose: () => void, onCreate: (name: string, description: string) => void }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Le nom du projet est requis.")
      return
    }
    setError("")
    onCreate(name, description)
    setName("")
    setDescription("")
    onClose()
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Nouveau projet</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nom du projet *</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm bg-background"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm bg-background"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          {error && <div className="text-red-500 text-xs">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit">Créer</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// --- Mock data type ---
export type Project = {
  id: string
  country: string // code pays (ex: 'FR')
  countryFlag: string // emoji ou URL
  name: string
  description: string
  criteriaMatchCount: number
  progressStatus: 'error' | 'in_progress' | 'ready'
  createdAt: string
}

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
  const [projects, setProjects] = useState<Project[]>(mockProjects)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [modalOpen, setModalOpen] = useState(false)

  // --- Ajout projet (mock) ---
  function handleCreateProject(name: string, description: string) {
    setProjects(prev => [
      {
        id: (Math.random() * 100000).toFixed(0),
        country: "FR",
        countryFlag: "🇫🇷",
        name,
        description,
        criteriaMatchCount: 0,
        progressStatus: "in_progress",
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ])
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
                onClick={() => router.push(`/projects/${info.row.original.id}`)}
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
    columnHelper.accessor("criteriaMatchCount", {
      header: "Match Facebook",
      cell: info => info.getValue(),
      size: 1,
    }),
    columnHelper.accessor("progressStatus", {
      header: "Statut",
      cell: info => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColor[info.getValue()]}`}>{statusLabel[info.getValue()]}</span>
      ),
      size: 1,
    }),
    columnHelper.accessor("createdAt", {
      header: "Date",
      cell: info => format(new Date(info.getValue()), "dd/MM/yyyy"),
      size: 1,
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="text-xs px-2">Éditer</Button>
          <Button size="sm" variant="destructive" className="text-xs px-2">Supprimer</Button>
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
        <Button onClick={() => setModalOpen(true)}>Nouveau projet</Button>
      </div>

      {/* Sélection groupée */}
      {Object.keys(rowSelection).length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {Object.keys(rowSelection).length} projet(s) sélectionné(s)
          </span>
          <Button variant="destructive" size="sm">
            Supprimer la sélection
          </Button>
        </div>
      )}

      {/* Tableau */}
      <div className="rounded-lg border bg-background w-full">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '42px' }} />
            <col style={{ width: '48px' }} />
            <col style={{ width: '40%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '14%' }} />
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
      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreateProject}
      />
    </div>
  )
} 