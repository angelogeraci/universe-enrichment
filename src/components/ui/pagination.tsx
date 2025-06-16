import React from "react"
import { Button } from "@/components/ui/button"

interface PaginationProps {
  // TanStack Table props
  table?: {
    getState: () => { pagination: { pageIndex: number; pageSize: number } }
    getPageCount: () => number
    getCanPreviousPage: () => boolean
    getCanNextPage: () => boolean
    setPageIndex: (index: number) => void
    previousPage: () => void
    nextPage: () => void
    setPageSize: (size: number) => void
    getFilteredRowModel: () => { rows: any[] }
  }
  
  // Props manuelles (pour pagination personnalisée)
  currentPage?: number
  totalPages?: number
  totalItems?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
  canPreviousPage?: boolean
  canNextPage?: boolean
  
  // Configuration
  pageSizeOptions?: number[]
  showPageSize?: boolean
  showInfo?: boolean
  className?: string
}

export function Pagination({
  table,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  canPreviousPage,
  canNextPage,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSize = true,
  showInfo = true,
  className = ""
}: PaginationProps) {
  // Utiliser les valeurs de TanStack Table si disponible, sinon les props manuelles
  const state = table?.getState()
  const pagination = state?.pagination
  
  const actualCurrentPage = table ? pagination!.pageIndex + 1 : currentPage || 1
  const actualTotalPages = table ? table.getPageCount() : totalPages || 1
  const actualPageSize = table ? pagination!.pageSize : pageSize || 25
  const actualTotalItems = table ? table.getFilteredRowModel().rows.length : totalItems || 0
  const actualCanPreviousPage = table ? table.getCanPreviousPage() : canPreviousPage ?? false
  const actualCanNextPage = table ? table.getCanNextPage() : canNextPage ?? false

  const handlePageChange = (page: number) => {
    if (table) {
      table.setPageIndex(page - 1)
    } else {
      onPageChange?.(page)
    }
  }

  const handlePageSizeChange = (size: number) => {
    if (table) {
      table.setPageSize(size)
    } else {
      onPageSizeChange?.(size)
    }
  }

  const handleFirstPage = () => {
    if (table) {
      table.setPageIndex(0)
    } else {
      onPageChange?.(1)
    }
  }

  const handlePreviousPage = () => {
    if (table) {
      table.previousPage()
    } else {
      onPageChange?.(Math.max(1, actualCurrentPage - 1))
    }
  }

  const handleNextPage = () => {
    if (table) {
      table.nextPage()
    } else {
      onPageChange?.(Math.min(actualTotalPages, actualCurrentPage + 1))
    }
  }

  const handleLastPage = () => {
    if (table) {
      table.setPageIndex(table.getPageCount() - 1)
    } else {
      onPageChange?.(actualTotalPages)
    }
  }

  return (
    <div className={`flex items-center justify-between mt-4 ${className}`}>
      {/* Sélecteur de nombre de résultats par page */}
      {showPageSize && (
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Results per page:</p>
          <select
            value={actualPageSize}
            onChange={e => handlePageSizeChange(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Contrôles de pagination */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleFirstPage}
          disabled={!actualCanPreviousPage}
        >
          {"<<"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviousPage}
          disabled={!actualCanPreviousPage}
        >
          {"<"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextPage}
          disabled={!actualCanNextPage}
        >
          {">"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLastPage}
          disabled={!actualCanNextPage}
        >
          {">>"}
        </Button>
        
        {showInfo && (
          <>
            <span className="flex items-center gap-1 text-sm">
              <div>Page</div>
              <strong>
                {actualCurrentPage} of {actualTotalPages}
              </strong>
            </span>
            <span className="text-sm text-gray-600">
              ({actualTotalItems} total items)
            </span>
          </>
        )}
      </div>
    </div>
  )
} 