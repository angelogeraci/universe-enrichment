'use client'
import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'
import { useToast } from '@/hooks/useToast'
import { OPENAI_MODELS, getModelsByCategory, type OpenAIModel } from '@/lib/openai-models'

type Prompt = {
  id: string
  label: string
  template: string
  description?: string
  searchType?: string
  model?: string
  isActive: boolean
}

const OUTPUT_FORMAT_INSTRUCTION = `IMPORTANT - FORMAT DE RÉPONSE REQUIS:
Vous devez répondre uniquement avec un tableau JSON de chaînes de caractères, sans texte explicatif, sans balises markdown, sans formatage supplémentaire.
Format attendu : ["item1", "item2", "item3"]
Règles strictes :
- Réponse UNIQUEMENT en format JSON array
- Chaque élément est une chaîne de caractères
- Pas de texte avant ou après le JSON
- Pas de balises \`\`\`json ou autres
- Maximum 200 éléments par réponse`

export default function PromptAdminEditor () {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const { success, error: showError, info } = useToast()

  // Organise les modèles par nouvelles catégories
  const modelsByCategory = {
    'GPT-4': OPENAI_MODELS.filter(m => m.category === 'GPT-4'),
    'Reasoning': OPENAI_MODELS.filter(m => m.category === 'Reasoning'),
    'GPT-3.5': OPENAI_MODELS.filter(m => m.category === 'GPT-3.5'),
    // Garde compatibilité avec anciens modèles
    'legacy': OPENAI_MODELS.filter(m => m.category === 'legacy'),
    'standard': OPENAI_MODELS.filter(m => m.category === 'standard')
  }

  useEffect(() => {
    fetchPrompts()
  }, [])

  const fetchPrompts = async () => {
    try {
      const res = await fetch('/api/prompts')
      if (!res.ok) {
        throw new Error('Erreur lors du chargement des prompts')
      }
      const data = await res.json()
      if (data.prompts) {
        setPrompts(data.prompts.filter((p: Prompt) => p.isActive && p.searchType))
        info('Prompts chargés avec succès', { duration: 2000 })
      }
      setLoading(false)
    } catch (error: any) {
      showError(error.message || 'Erreur lors du chargement des prompts', { duration: 5000 })
      setLoading(false)
    }
  }

  const handleChange = (promptId: string, field: string, value: string) => {
    setPrompts(prevPrompts => 
      prevPrompts.map(prompt => 
        prompt.id === promptId 
          ? { ...prompt, [field]: value }
          : prompt
      )
    )
  }

  const handleModelChange = (promptId: string, event: ChangeEvent<HTMLSelectElement>) => {
    handleChange(promptId, 'model', event.target.value)
  }

  const handleSave = async (prompt: Prompt) => {
    setSaving(prompt.id)
    
    try {
      const res = await fetch(`/api/prompts/${prompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: prompt.label,
          template: prompt.template,
          description: prompt.description,
          searchType: prompt.searchType,
          model: prompt.model,
          isActive: true
        })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde')
      }
      
      success(`Prompt "${prompt.label}" sauvegardé avec succès !`, { duration: 4000 })
    } catch (e: any) {
      showError(e.message || 'Erreur lors de la sauvegarde du prompt', { duration: 5000 })
    } finally {
      setSaving(null)
    }
  }

  const getSearchTypeLabel = (searchType: string) => {
    switch (searchType) {
      case 'origin': return '🏠 Originaires uniquement'
      case 'presence': return '🌍 Originaires + Présents'
      default: return searchType
    }
  }

  const getSearchTypeDescription = (searchType: string) => {
    switch (searchType) {
      case 'origin': 
        return 'Ce prompt génère uniquement des critères qui sont strictement originaires du pays sélectionné.'
      case 'presence': 
        return 'Ce prompt génère des critères qui sont soit originaires du pays, soit populaires/présents dans ce pays.'
      default: 
        return 'Type de recherche non défini'
    }
  }

  const getModelDescription = (modelId: string) => {
    const model = OPENAI_MODELS.find(m => m.id === modelId)
    return model ? model.description : 'Modèle inconnu'
  }

  if (loading) return <div>Chargement des prompts...</div>
  if (prompts.length === 0) return <div>Aucun prompt configuré.</div>

  return (
    <div className="space-y-8 max-w-4xl">
      <h2 className="text-2xl font-bold mb-4">🎯 Configuration des Prompts Spécialisés</h2>
      
      {prompts.map((prompt) => (
        <div key={prompt.id} className="border rounded-lg p-6 bg-white shadow-sm">
          {/* Header avec type de recherche */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <h3 className="font-semibold text-lg text-blue-800 mb-2">
              {getSearchTypeLabel(prompt.searchType || '')}
            </h3>
            <p className="text-blue-700 text-sm">
              {getSearchTypeDescription(prompt.searchType || '')}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Label</label>
              <Input 
                value={prompt.label} 
                onChange={(e) => handleChange(prompt.id, 'label', e.target.value)}
                required 
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Modèle OpenAI</label>
              <select 
                value={prompt.model || 'gpt-4o'} 
                onChange={(e) => handleModelChange(prompt.id, e)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <optgroup label="🚀 GPT-4 (2025)">
                  {modelsByCategory['GPT-4'].map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} {model.id === 'gpt-4o' ? '⭐ Recommandé' : ''}
                    </option>
                  ))}
                </optgroup>
                
                <optgroup label="🧠 Modèles de Raisonnement">
                  {modelsByCategory['Reasoning'].map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </optgroup>
                
                <optgroup label="⚡ GPT-3.5">
                  {modelsByCategory['GPT-3.5'].map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </optgroup>
                
                {modelsByCategory['standard'] && modelsByCategory['standard'].length > 0 && (
                  <optgroup label="🔧 Standards">
                    {modelsByCategory['standard'].map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                
                {modelsByCategory['legacy'] && modelsByCategory['legacy'].length > 0 && (
                  <optgroup label="📜 Classiques">
                    {modelsByCategory['legacy'].map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <p className="text-xs text-gray-600 mt-1">
                <strong>Sélectionné:</strong> {getModelDescription(prompt.model || 'gpt-4o')}
              </p>
            </div>
            
            <div>
              <label className="block font-medium mb-1">Template du Prompt</label>
              <Textarea 
                value={prompt.template} 
                onChange={(e) => handleChange(prompt.id, 'template', e.target.value)}
                rows={12} 
                required 
                className="font-mono text-sm"
                placeholder="Utilisez {{category}}, {{categoryPath}} et {{country}} comme variables"
              />
              <p className="text-sm text-gray-600 mt-1">
                Variables disponibles: <code>{'{{category}}'}</code>, <code>{'{{categoryPath}}'}</code>, <code>{'{{country}}'}</code>
              </p>
            </div>

            <div>
              <label className="block font-medium mb-1">Description</label>
              <Textarea 
                value={prompt.description || ''} 
                onChange={(e) => handleChange(prompt.id, 'description', e.target.value)}
                rows={2} 
              />
            </div>

            <Button 
              onClick={() => handleSave(prompt)}
              disabled={saving === prompt.id}
              className="w-full"
            >
              {saving === prompt.id ? 'Sauvegarde...' : `Enregistrer ${getSearchTypeLabel(prompt.searchType || '')}`}
            </Button>
          </div>
        </div>
      ))}

      {/* Zone Format de Sortie - Non Éditable */}
      <div className="border-t pt-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg mb-3 text-gray-800">
            📋 Format de Sortie OpenAI (Non Modifiable)
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Cette instruction est automatiquement ajoutée à vos prompts pour assurer la cohérence du format de réponse:
          </p>
          <Textarea 
            value={OUTPUT_FORMAT_INSTRUCTION}
            readOnly 
            rows={12}
            className="bg-white border-gray-300 cursor-not-allowed font-mono text-sm"
          />
          <div className="mt-3 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Information:</strong> Cette partie est automatiquement combinée avec vos templates 
              lors de l'envoi à OpenAI pour garantir un format de réponse cohérent.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 