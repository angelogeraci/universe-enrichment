'use client'
import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'

type Prompt = {
  id: string
  label: string
  template: string
  description?: string
  isActive: boolean
}

const OUTPUT_CONSTRAINT = '["item1", "item2", ...] (tableau JSON de chaînes, sans texte, sans balise markdown)'

export default function PromptAdminEditor () {
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetch('/api/prompts')
      .then(res => res.json())
      .then(data => {
        setPrompt(data.prompts?.[0] || null)
        setLoading(false)
      })
      .catch(() => {
        setError('Erreur lors du chargement du prompt')
        setLoading(false)
      })
  }, [])

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!prompt) return
    setPrompt({ ...prompt, [e.target.name]: e.target.value })
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!prompt) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/prompts/${prompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: prompt.label,
          template: prompt.template,
          description: prompt.description,
          isActive: true
        })
      })
      if (!res.ok) throw new Error('Erreur lors de la sauvegarde')
      setSuccess('Modifications enregistrées')
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Chargement du prompt...</div>
  if (!prompt) return <div>Aucun prompt trouvé.</div>

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-2xl">
      <div>
        <label className="block font-medium mb-1">Label</label>
        <Input name="label" value={prompt.label} onChange={handleChange} required />
      </div>
      <div>
        <label className="block font-medium mb-1">Template</label>
        <Textarea name="template" value={prompt.template} onChange={handleChange} rows={6} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Contrainte d'output (non éditable)</label>
        <Input value={OUTPUT_CONSTRAINT} readOnly className="bg-gray-100 cursor-not-allowed" />
      </div>
      <div>
        <label className="block font-medium mb-1">Description</label>
        <Textarea name="description" value={prompt.description || ''} onChange={handleChange} rows={3} />
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {success && <div className="text-green-600 text-sm">{success}</div>}
      <Button type="submit" disabled={saving}>{saving ? 'Sauvegarde...' : 'Enregistrer'}</Button>
    </form>
  )
} 