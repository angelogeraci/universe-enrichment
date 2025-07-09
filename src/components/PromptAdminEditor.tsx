'use client'
import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'
import { useToast } from '@/hooks/useToast'
import { OPENAI_MODELS, getModelsByCategory, type OpenAIModel } from '@/lib/openai-models'
import { ANTHROPIC_MODELS, getAnthropicModelsByCategory, type AnthropicModel } from '@/lib/anthropic-models'

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

  // Organise TOUS les modèles (OpenAI + Anthropic) par catégories
  const allModelsByCategory = {
    // Modèles Anthropic Claude
    'Claude-4': getAnthropicModelsByCategory('Claude-4'),
    'Claude-3.5': getAnthropicModelsByCategory('Claude-3.5'),
    'Claude-3': getAnthropicModelsByCategory('Claude-3'),
    'Claude-Reasoning': getAnthropicModelsByCategory('Reasoning'),
    
    // Modèles OpenAI
    'GPT-4': getModelsByCategory('GPT-4'),
    'OpenAI-Reasoning': getModelsByCategory('Reasoning'),
    'GPT-3.5': getModelsByCategory('GPT-3.5'),
    
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
    // Chercher dans les modèles OpenAI d'abord
    const openaiModel = OPENAI_MODELS.find(m => m.id === modelId)
    if (openaiModel) return openaiModel.description
    
    // Chercher dans les modèles Anthropic
    const anthropicModel = ANTHROPIC_MODELS.find(m => m.id === modelId)
    if (anthropicModel) return anthropicModel.description
    
    return 'Modèle inconnu'
  }

  const isAnthropicModel = (modelId: string): boolean => {
    return ANTHROPIC_MODELS.some(m => m.id === modelId)
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
              <label className="block font-medium mb-1">Modèle IA</label>
              <select 
                value={prompt.model || 'gpt-4o'} 
                onChange={(e) => handleModelChange(prompt.id, e)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {/* Modèles Anthropic Claude */}
                <optgroup label="🔮 Claude 4 (2025) - Anthropic">
                  {allModelsByCategory['Claude-4'].map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} {model.id === 'claude-4-sonnet-20250522' ? '⭐ Dernier' : ''}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="🧠 Claude 3.5 (2024-2025) - Anthropic">
                  {allModelsByCategory['Claude-3.5'].map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} {model.id === 'claude-3-5-sonnet-20241022' ? '⭐ Recommandé' : ''}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="💭 Claude Raisonnement - Anthropic">
                  {allModelsByCategory['Claude-Reasoning'].map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} (Thinking)
                    </option>
                  ))}
                </optgroup>

                <optgroup label="📚 Claude 3 Classic - Anthropic">
                  {allModelsByCategory['Claude-3'].map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </optgroup>
                
                {/* Séparateur visuel */}
                <optgroup label="━━━━━━━━━━━━━━━━━━━━━━━">
                  <option disabled>Modèles OpenAI</option>
                </optgroup>
                
                {/* Modèles OpenAI */}
                <optgroup label="🚀 GPT-4 (2025) - OpenAI">
                  {allModelsByCategory['GPT-4'].map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} {model.id === 'gpt-4o' ? '⭐ Recommandé' : ''}
                    </option>
                  ))}
                </optgroup>
                
                <optgroup label="🧠 OpenAI Raisonnement">
                  {allModelsByCategory['OpenAI-Reasoning'].map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </optgroup>
                
                <optgroup label="⚡ GPT-3.5 - OpenAI">
                  {allModelsByCategory['GPT-3.5'].map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </optgroup>
                
                {allModelsByCategory['standard'] && allModelsByCategory['standard'].length > 0 && (
                  <optgroup label="🔧 Standards">
                    {allModelsByCategory['standard'].map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                
                {allModelsByCategory['legacy'] && allModelsByCategory['legacy'].length > 0 && (
                  <optgroup label="📜 Classiques">
                    {allModelsByCategory['legacy'].map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <div className="text-xs text-gray-600 mt-1">
                <strong>Sélectionné:</strong> {getModelDescription(prompt.model || 'gpt-4o')}
                {isAnthropicModel(prompt.model || 'gpt-4o') && 
                  <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                    🔮 Anthropic Claude
                  </span>
                }
                {!isAnthropicModel(prompt.model || 'gpt-4o') && 
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                    🤖 OpenAI
                  </span>
                }
              </div>
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
            📋 Format de Sortie IA (Non Modifiable)
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Cette instruction est automatiquement ajoutée à vos prompts pour assurer la cohérence du format de réponse avec <strong>tous les modèles</strong> (OpenAI et Anthropic):
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
              lors de l'envoi aux modèles IA (OpenAI GPT et Anthropic Claude) pour garantir un format de réponse cohérent.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 