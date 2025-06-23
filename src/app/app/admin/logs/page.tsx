'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface EnrichmentLog {
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
  const [clearing, setClearing] = useState(false)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/logs')
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error('Erreur chargement logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer tous les logs ?')) return
    
    try {
      setClearing(true)
      const response = await fetch('/api/admin/logs', {
        method: 'DELETE'
      })
      const data = await response.json()
      if (response.ok) {
        setLogs([])
        alert(data.message)
      } else {
        alert(`Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error('Erreur suppression logs:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setClearing(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  if (loading) {
    return (
      <div className="w-full px-32 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Logs OpenAI</h1>
        </div>
        <div className="text-center py-8">Chargement des logs...</div>
      </div>
    )
  }

  return (
    <div className="w-full px-32 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Logs OpenAI</h1>
        <div className="flex gap-2">
          <Button onClick={fetchLogs} variant="outline">
            Actualiser
          </Button>
          <Button 
            onClick={clearLogs} 
            variant="destructive" 
            disabled={clearing || logs.length === 0}
          >
            {clearing ? 'Suppression...' : 'Vider les logs'}
          </Button>
        </div>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun log d'enrichissement disponible
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {log.projectName} - {log.category}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={log.responseStatus === 'success' ? 'default' : 'destructive'}>
                      {log.responseStatus}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(log.createdAt), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </span>
                  </div>
                </div>
                <CardDescription>
                  <div className="flex gap-4 text-sm">
                    <span>🌍 {log.country}</span>
                    <span>🔍 {log.searchType}</span>
                    <span>🤖 {log.model}</span>
                    <span>⏱️ {log.processingTime}ms</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Prompt envoyé:</h4>
                  <div className="bg-muted p-3 rounded text-sm max-h-32 overflow-y-auto">
                    {log.promptSent}
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Réponse OpenAI:</h4>
                  <div className="bg-muted p-3 rounded text-sm max-h-48 overflow-y-auto">
                    <pre className="whitespace-pre-wrap">{log.responseRaw}</pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 