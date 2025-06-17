'use client'
import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const DEFAULTS = {
  facebookBatchSize: 100,
  facebookPauseMs: 5000,
  facebookRelevanceScoreThreshold: 30 // in percentage
}

export default function AdminSettingsPage() {
  const [facebookBatchSize, setFacebookBatchSize] = useState<number>(DEFAULTS.facebookBatchSize)
  const [facebookPauseMs, setFacebookPauseMs] = useState<number>(DEFAULTS.facebookPauseMs)
  const [facebookRelevanceScoreThreshold, setFacebookRelevanceScoreThreshold] = useState<number>(DEFAULTS.facebookRelevanceScoreThreshold)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load settings on mount
  useEffect(() => {
    setLoading(true)
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        setFacebookBatchSize(Number(data.facebookBatchSize ?? DEFAULTS.facebookBatchSize))
        setFacebookPauseMs(Number(data.facebookPauseMs ?? DEFAULTS.facebookPauseMs))
        // Convert decimal -> percentage
        setFacebookRelevanceScoreThreshold(Number(data.facebookRelevanceScoreThreshold ?? (DEFAULTS.facebookRelevanceScoreThreshold / 100)) * 100)
        setError(null)
      })
      .catch(() => setError('Error loading settings'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facebookBatchSize,
          facebookPauseMs,
          facebookRelevanceScoreThreshold: facebookRelevanceScoreThreshold / 100 // convert percentage -> decimal
        })
      })
      if (!res.ok) throw new Error('Error saving settings')
      setSuccess('Settings saved!')
    } catch (err) {
      setError('Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-8 bg-white rounded-lg border shadow">
      <h1 className="text-2xl font-bold mb-6">Application Settings</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block font-medium mb-1">Facebook requests before pause</label>
            <Input
              type="number"
              min={1}
              value={facebookBatchSize}
              onChange={e => setFacebookBatchSize(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Pause duration (ms)</label>
            <Input
              type="number"
              min={0}
              step={100}
              value={facebookPauseMs}
              onChange={e => setFacebookPauseMs(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Minimum relevance score (%)</label>
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              value={facebookRelevanceScoreThreshold}
              onChange={e => setFacebookRelevanceScoreThreshold(Number(e.target.value))}
              required
            />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </form>
      )}
    </div>
  )
} 