'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface FacebookLog {
  timestamp: string
  type: 'AUTO_ENRICHMENT' | 'MANUAL_SEARCH' | 'TOKEN_TEST'
  critere: string
  projectSlug?: string
  projectId?: string
  responseStatus?: number
  errorType?: string
  errorMessage?: string
  processingTime: number
  retryAttempt?: number
  finalResult: 'SUCCESS' | 'FAILED' | 'RETRY'
  suggestions?: Array<{
    label: string
    audience: string
    similarityScore: number
  }>
}

interface LogAnalysis {
  totalLogs: number
  autoEnrichmentLogs: number
  manualSearchLogs: number
  successRateAuto: string
  successRateManual: string
  critereCount: number
  problematicCriteres: Array<{
    critere: string
    issue: string
    autoAttempts: number
    manualAttempts: number
    lastAutoError?: string
    lastAutoErrorType?: string
    suggestions: any[]
  }>
  commonErrors: Array<{
    error: string
    count: number
  }>
  timeline: Array<{
    hour: string
    success: number
    failed: number
    retry: number
    total: number
  }>
}

export default function FacebookLogsPage() {
  const [logs, setLogs] = useState<FacebookLog[]>([])
  const [analysis, setAnalysis] = useState<LogAnalysis | null>(null)
  const [summary, setSummary] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'logs' | 'analysis' | 'summary'>('analysis')

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/facebook-logs')
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des logs:', error)
    }
    setLoading(false)
  }

  const fetchAnalysis = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/facebook-logs?action=analyze')
      if (response.ok) {
        const data = await response.json()
        setAnalysis(data.analysis)
      }
    } catch (error) {
      console.error('Erreur lors de l\'analyse des logs:', error)
    }
    setLoading(false)
  }

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/facebook-logs?action=summary')
      if (response.ok) {
        const data = await response.json()
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Erreur lors du chargement du résumé:', error)
    }
    setLoading(false)
  }

  const downloadLogs = async () => {
    try {
      const response = await fetch('/api/admin/facebook-logs?action=download')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `facebook-logs-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error)
    }
  }

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs()
    } else if (activeTab === 'analysis') {
      fetchAnalysis()
    } else if (activeTab === 'summary') {
      fetchSummary()
    }
  }, [activeTab])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('fr-FR')
  }

  const getStatusBadge = (result: string) => {
    switch (result) {
      case 'SUCCESS':
        return <Badge className="bg-green-100 text-green-800">Succès</Badge>
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800">Échec</Badge>
      case 'RETRY':
        return <Badge className="bg-yellow-100 text-yellow-800">Retry</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{result}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'AUTO_ENRICHMENT':
        return <Badge className="bg-blue-100 text-blue-800">Auto</Badge>
      case 'MANUAL_SEARCH':
        return <Badge className="bg-purple-100 text-purple-800">Manuel</Badge>
      case 'TOKEN_TEST':
        return <Badge className="bg-orange-100 text-orange-800">Test Token</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{type}</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Logs Facebook</h1>
          <p className="text-gray-600">Analyse des interactions avec l'API Facebook</p>
        </div>
        <Button onClick={downloadLogs} variant="outline">
          📥 Télécharger les logs
        </Button>
      </div>

      <div className="flex space-x-4 mb-6">
        <Button
          onClick={() => setActiveTab('analysis')}
          variant={activeTab === 'analysis' ? 'default' : 'outline'}
        >
          📊 Analyse
        </Button>
        <Button
          onClick={() => setActiveTab('logs')}
          variant={activeTab === 'logs' ? 'default' : 'outline'}
        >
          📝 Logs récents
        </Button>
        <Button
          onClick={() => setActiveTab('summary')}
          variant={activeTab === 'summary' ? 'default' : 'outline'}
        >
          📋 Résumé
        </Button>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Chargement...</p>
        </div>
      )}

      {activeTab === 'analysis' && analysis && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total des logs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{analysis.totalLogs}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Taux de succès Auto</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">{analysis.successRateAuto}%</p>
                <p className="text-sm text-gray-600">{analysis.autoEnrichmentLogs} logs</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Taux de succès Manuel</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{analysis.successRateManual}%</p>
                <p className="text-sm text-gray-600">{analysis.manualSearchLogs} logs</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Critères uniques</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{analysis.critereCount}</p>
              </CardContent>
            </Card>
          </div>

          {analysis.problematicCriteres.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Critères problématiques</CardTitle>
                <CardDescription>
                  Critères qui échouent en enrichissement automatique mais peuvent réussir en manuel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.problematicCriteres.slice(0, 10).map((critere, index) => (
                    <div key={index} className="border-l-4 border-red-400 pl-4 py-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-lg">{critere.critere}</h4>
                          <p className="text-red-600 text-sm">{critere.issue}</p>
                          <p className="text-gray-600 text-sm">
                            Auto: {critere.autoAttempts} tentatives | Manuel: {critere.manualAttempts} tentatives
                          </p>
                          {critere.lastAutoError && (
                            <p className="text-gray-500 text-xs mt-1">
                              Dernière erreur: {critere.lastAutoError.substring(0, 100)}...
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {critere.suggestions.length > 0 && (
                            <Badge className="bg-green-100 text-green-800">
                              {critere.suggestions.length} suggestions
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Erreurs fréquentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.commonErrors.map((error, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm">{error.error}</span>
                    <Badge>{error.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'logs' && (
        <Card>
          <CardHeader>
            <CardTitle>Logs récents (100 derniers)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {logs.map((log, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex space-x-2">
                      {getTypeBadge(log.type)}
                      {getStatusBadge(log.finalResult)}
                      {log.retryAttempt && log.retryAttempt > 0 && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          Tentative {log.retryAttempt + 1}
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  
                  <h4 className="font-semibold">{log.critere}</h4>
                  
                  {log.projectSlug && (
                    <p className="text-sm text-gray-600">Projet: {log.projectSlug}</p>
                  )}
                  
                  <div className="flex justify-between items-center mt-2 text-sm">
                    <div>
                      {log.responseStatus && (
                        <span className="mr-4">Status: {log.responseStatus}</span>
                      )}
                      <span>Temps: {log.processingTime}ms</span>
                    </div>
                    
                    {log.suggestions && log.suggestions.length > 0 && (
                      <span className="text-green-600">
                        {log.suggestions.length} suggestions
                      </span>
                    )}
                  </div>
                  
                  {log.errorMessage && (
                    <p className="text-red-600 text-sm mt-2 bg-red-50 p-2 rounded">
                      {log.errorType}: {log.errorMessage}
                    </p>
                  )}
                </div>
              ))}
              
              {logs.length === 0 && !loading && (
                <p className="text-center text-gray-500 py-8">
                  Aucun log disponible
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'summary' && (
        <Card>
          <CardHeader>
            <CardTitle>Résumé technique</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {summary || 'Aucun résumé disponible'}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 