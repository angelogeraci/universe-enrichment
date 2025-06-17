'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/useToast'

type EnrichmentLog = {
  id: string
  projectId: string
  projectName: string
  category: string
  country: string
  searchType: string
  model: string
  promptSent: string
  responseRaw: string
  responseStatus: string
  processingTime: number
  createdAt: string
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<EnrichmentLog[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const { success, error: showError, info } = useToast()

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/logs')
      if (!res.ok) {
        throw new Error('Error loading logs')
      }
      const data = await res.json()
      setLogs(data.logs || [])
    } catch (error: any) {
      showError(error.message || 'Error loading logs', { duration: 5000 })
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = async () => {
    try {
      setDeleting(true)
      const res = await fetch('/api/admin/logs', {
        method: 'DELETE'
      })
      if (!res.ok) {
        throw new Error('Error deleting logs')
      }
      const data = await res.json()
      success(data.message || 'Logs deleted successfully', { duration: 3000 })
      setLogs([])
    } catch (error: any) {
      showError(error.message || 'Error deleting logs', { duration: 5000 })
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium"
    switch (status) {
      case 'success':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'error':
        return `${baseClasses} bg-red-100 text-red-800`
      case 'processing':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">Loading logs...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🔍 OpenAI Logs</h1>
                <p className="text-gray-600 mt-1">
                  Logs of OpenAI enrichment requests and responses
                </p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={fetchLogs}
                  variant="outline"
                  disabled={loading}
                >
                  🔄 Refresh
                </Button>
                <Button 
                  onClick={clearLogs}
                  variant="destructive"
                  disabled={deleting || logs.length === 0}
                >
                  {deleting ? 'Deleting...' : '🗑️ Delete'}
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {logs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg">
                  📝 No logs available
                </div>
                <p className="text-gray-400 mt-2">
                  Logs will appear here after running an enrichment
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {logs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-6 bg-gray-50">
                    {/* Header du log */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {log.projectName} - {log.category}
                        </h3>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <span>🌍 {log.country}</span>
                          <span>🔍 {log.searchType}</span>
                          <span>🤖 {log.model}</span>
                          <span>⏱️ {log.processingTime}ms</span>
                          <span>📅 {formatDate(log.createdAt)}</span>
                        </div>
                      </div>
                      <span className={getStatusBadge(log.responseStatus)}>
                        {log.responseStatus === 'success' ? '✅ Success' : 
                         log.responseStatus === 'error' ? '❌ Error' : 
                         '⏳ Processing'}
                      </span>
                    </div>

                    {/* Prompt envoyé */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        📤 Prompt sent to OpenAI
                      </h4>
                      <Textarea
                        value={log.promptSent}
                        readOnly
                        rows={8}
                        className="font-mono text-sm bg-blue-50 border-blue-200"
                      />
                    </div>

                    {/* Réponse reçue */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">
                        📥 Raw OpenAI response
                      </h4>
                      <Textarea
                        value={log.responseRaw}
                        readOnly
                        rows={6}
                        className={`font-mono text-sm ${
                          log.responseStatus === 'success' 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}
                      />
                    </div>

                    {/* Informations additionnelles */}
                    <div className="mt-4 p-4 bg-white rounded border border-gray-200">
                      <h5 className="font-medium text-gray-900 mb-2">ℹ️ Technical information</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Project ID:</span>
                          <br />
                          <code className="text-xs bg-gray-100 px-1 rounded">{log.projectId}</code>
                        </div>
                        <div>
                          <span className="text-gray-600">Search type:</span>
                          <br />
                          <span className="font-medium">{log.searchType}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Model used:</span>
                          <br />
                          <span className="font-medium">{log.model}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Processing time:</span>
                          <br />
                          <span className="font-medium">{log.processingTime}ms</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 