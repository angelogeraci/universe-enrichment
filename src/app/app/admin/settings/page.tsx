'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

interface AppSettings {
  facebookBatchSize: string
  facebookPauseMs: string
  facebookRelevanceScoreThreshold: string
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    facebookBatchSize: '',
    facebookPauseMs: '',
    facebookRelevanceScoreThreshold: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      if (res.ok) {
        setHasChanges(false)
      }
    } catch (e) {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key: keyof AppSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  useEffect(() => { fetchSettings() }, [])

  if (loading) {
    return <div className="w-full px-32 py-6">Chargement...</div>
  }

  return (
    <div className="w-full px-32 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Paramètres de l'application</h1>
        <div className="flex gap-2">
          <Button onClick={saveSettings} disabled={!hasChanges || saving}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>API Facebook</CardTitle>
          <CardDescription>Configuration pour l'enrichissement Facebook</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="facebookBatchSize">Batch Size</Label>
              <Input id="facebookBatchSize" type="number" value={settings.facebookBatchSize} onChange={e => handleChange('facebookBatchSize', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebookPauseMs">Pause (ms)</Label>
              <Input id="facebookPauseMs" type="number" value={settings.facebookPauseMs} onChange={e => handleChange('facebookPauseMs', e.target.value)} />
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="facebookRelevanceScoreThreshold">Seuil de pertinence</Label>
            <Input id="facebookRelevanceScoreThreshold" type="number" step="0.1" min="0" max="1" value={settings.facebookRelevanceScoreThreshold} onChange={e => handleChange('facebookRelevanceScoreThreshold', e.target.value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}