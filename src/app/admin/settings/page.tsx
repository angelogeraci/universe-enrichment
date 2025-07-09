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
          <CardTitle>API Facebook - Optimisation des performances</CardTitle>
          <CardDescription>
            Configuration pour l'enrichissement des données via Facebook. Optimisez ces paramètres selon votre plan Facebook API.
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
              <p className="text-sm text-gray-600">
                📊 <strong>Recommandé:</strong><br/>
                • <strong>Standard Access (App Review):</strong> 100-200 requêtes<br/>
                • <strong>Development:</strong> 25-50 requêtes<br/>
                • Plus élevé = plus rapide mais risque rate limit
              </p>
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
              <p className="text-sm text-gray-600">
                ⏱️ <strong>Recommandé:</strong><br/>
                • <strong>Standard Access:</strong> 1000-2000ms (1-2s)<br/>
                • <strong>Development:</strong> 3000-5000ms (3-5s)<br/>
                • Plus bas = plus rapide mais risque rate limit
              </p>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">💡 Stratégies d'accélération</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Parallélisation:</strong> Utilisez plusieurs comptes ad Facebook</li>
              <li>• <strong>Mise à niveau:</strong> Demandez Advanced Access (Ads Management)</li>
              <li>• <strong>Optimisation requêtes:</strong> Filtrez les critères pour éviter les doublons</li>
              <li>• <strong>Cache intelligent:</strong> Réutilisez les suggestions déjà trouvées</li>
            </ul>
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
            <p className="text-sm text-gray-600">
              🎯 Plus bas = plus de suggestions (mais moins pertinentes)
            </p>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-lg">
            <h4 className="font-semibold text-amber-800 mb-2">⚡ Configuration Rapide Recommandée</h4>
            <div className="text-sm text-amber-700 space-y-2">
              <p><strong>Pour Development Access (par défaut):</strong></p>
              <p>• Batch Size: 25-30 • Pause: 3000ms • Pertinence: 0.3</p>
              <p><strong>Pour Standard Access (après App Review):</strong></p>
              <p>• Batch Size: 100-150 • Pause: 1000ms • Pertinence: 0.3</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminSettingsPage