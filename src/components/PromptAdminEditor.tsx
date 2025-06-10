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

const OUTPUT_FORMAT_INSTRUCTION = `Vous devez répondre uniquement avec un tableau JSON de chaînes de caractères, sans texte explicatif, sans balises markdown, sans formatage supplémentaire.

Format attendu : ["item1", "item2", "item3"]

Règles strictes :
- Réponse UNIQUEMENT en format JSON array
- Chaque élément est une chaîne de caractères
- Pas de texte avant ou après le JSON
- Pas de balises \`\`\`json ou autres
- Maximum 50 éléments par réponse`

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
    <div className="space-y-6 max-w-4xl">
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Label</label>
          <Input name="label" value={prompt.label} onChange={handleChange} required />
        </div>
        
        <div>
          <label className="block font-medium mb-1">Template du Prompt (Partie Éditable)</label>
          <Textarea 
            name="template" 
            value={prompt.template} 
            onChange={handleChange} 
            rows={8} 
            required 
            className="font-mono text-sm"
            placeholder="Utilisez {{category}}, {{country}}, {{options}} comme variables"
          />
          <p className="text-sm text-gray-600 mt-1">
            Variables disponibles: <code>{'{{category}}'}</code>, <code>{'{{country}}'}</code>, <code>{'{{options}}'}</code>
          </p>
        </div>

        <div>
          <label className="block font-medium mb-1">Description</label>
          <Textarea name="description" value={prompt.description || ''} onChange={handleChange} rows={3} />
        </div>

        {error && <div className="text-red-500 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">{success}</div>}
        
        <Button type="submit" disabled={saving}>
          {saving ? 'Sauvegarde...' : 'Enregistrer'}
        </Button>
      </form>

      {/* Zone Format de Sortie - Non Éditable */}
      <div className="border-t pt-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg mb-3 text-gray-800">
            📋 Format de Sortie OpenAI (Non Modifiable)
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Cette instruction est automatiquement ajoutée à votre prompt pour assurer la cohérence du format de réponse:
          </p>
          <Textarea 
            value={OUTPUT_FORMAT_INSTRUCTION}
            readOnly 
            rows={12}
            className="bg-white border-gray-300 cursor-not-allowed font-mono text-sm"
          />
          <div className="mt-3 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Information:</strong> Cette partie est automatiquement combinée avec votre template 
              lors de l'envoi à OpenAI pour garantir un format de réponse cohérent.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 