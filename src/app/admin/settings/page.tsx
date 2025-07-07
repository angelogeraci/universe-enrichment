'use client'

import { useEffect, useState, ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface AppSettings {
  facebookBatchSize: string
  facebookPauseMs: string
  facebookRelevanceScoreThreshold: string
}

const AdminSettingsPage = () => {
  const [settings, setSettings] = useState<AppSettings>({
    facebookBatchSize: '',
    facebookPauseMs: '',
    facebookRelevanceScoreThreshold: '',
  })
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [hasChanges, setHasChanges] = useState<boolean>(false)

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
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
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setHasChanges(false)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setSettings(prev => ({ ...prev, [id]: value }))
    setHasChanges(true)
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  if (loading) {
    return <div className="p-6">Chargement des paramètres...</div>
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Paramètres de l'application</h1>
        <Button onClick={saveSettings} disabled={!hasChanges || saving}>
          {saving ? 'Sauvegarde en cours...' : 'Sauvegarder les changements'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Facebook</CardTitle>
          <CardDescription>
            Configuration pour l'enrichissement des données via Facebook.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="facebookBatchSize">Taille des lots (Batch Size)</Label>
              <Input
                id="facebookBatchSize"
                type="number"
                value={settings.facebookBatchSize}
                onChange={handleChange}
                placeholder="Ex: 50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebookPauseMs">Pause entre les lots (ms)</Label>
              <Input
                id="facebookPauseMs"
                type="number"
                value={settings.facebookPauseMs}
                onChange={handleChange}
                placeholder="Ex: 1000"
              />
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="facebookRelevanceScoreThreshold">
              Seuil de pertinence (0 à 1)
            </Label>
            <Input
              id="facebookRelevanceScoreThreshold"
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={settings.facebookRelevanceScoreThreshold}
              onChange={handleChange}
              placeholder="Ex: 0.5"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminSettingsPage