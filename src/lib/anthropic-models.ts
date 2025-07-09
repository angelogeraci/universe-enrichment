export interface AnthropicModel {
  id: string
  name: string
  description: string
  category: 'Claude-4' | 'Claude-3.5' | 'Claude-3' | 'Reasoning'
  maxTokens: number
  inputCost: number // coût par million de tokens d'entrée
  outputCost: number // coût par million de tokens de sortie
  contextWindow: number
  reasoning?: boolean
}

export const ANTHROPIC_MODELS: AnthropicModel[] = [
  // Claude 4 Series (2025)
  {
    id: 'claude-4-sonnet-20250522',
    name: 'Claude 4 Sonnet',
    description: 'Most advanced Claude model with state-of-the-art coding and reasoning capabilities',
    category: 'Claude-4',
    maxTokens: 200000,
    inputCost: 3,
    outputCost: 15,
    contextWindow: 200000
  },
  
  // Claude 3.7 Series (2025)
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet',
    description: 'Advanced reasoning model with thinking capabilities for complex problem solving',
    category: 'Reasoning',
    maxTokens: 150000,
    inputCost: 4,
    outputCost: 20,
    contextWindow: 150000,
    reasoning: true
  },
  
  // Claude 3.5 Series (2024)
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet (Oct 2024)',
    description: 'Balanced performance with excellent coding and analysis capabilities',
    category: 'Claude-3.5',
    maxTokens: 200000,
    inputCost: 3,
    outputCost: 15,
    contextWindow: 200000
  },
  {
    id: 'claude-3-5-sonnet-20240620',
    name: 'Claude 3.5 Sonnet (June 2024)',
    description: 'Original Claude 3.5 Sonnet with strong general-purpose capabilities',
    category: 'Claude-3.5',
    maxTokens: 200000,
    inputCost: 3,
    outputCost: 15,
    contextWindow: 200000
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    description: 'Fastest Claude model, optimized for quick responses and efficiency',
    category: 'Claude-3.5',
    maxTokens: 200000,
    inputCost: 0.8,
    outputCost: 4,
    contextWindow: 200000
  },

  // Claude 3 Classic Series
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    description: 'Powerful model for complex tasks requiring deep understanding',
    category: 'Claude-3',
    maxTokens: 200000,
    inputCost: 15,
    outputCost: 75,
    contextWindow: 200000
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    description: 'Balanced model for most use cases with good performance',
    category: 'Claude-3',
    maxTokens: 200000,
    inputCost: 3,
    outputCost: 15,
    contextWindow: 200000
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    description: 'Fast and cost-effective model for simple tasks',
    category: 'Claude-3',
    maxTokens: 200000,
    inputCost: 0.25,
    outputCost: 1.25,
    contextWindow: 200000
  }
]

/**
 * Filtre les modèles Anthropic par catégorie
 */
export function getAnthropicModelsByCategory(category: 'Claude-4' | 'Claude-3.5' | 'Claude-3' | 'Reasoning'): AnthropicModel[] {
  return ANTHROPIC_MODELS.filter(model => model.category === category)
}

/**
 * Récupère un modèle Anthropic par son ID
 */
export function getAnthropicModelById(id: string): AnthropicModel | undefined {
  return ANTHROPIC_MODELS.find(model => model.id === id)
}

/**
 * Vérifie si un ID correspond à un modèle Anthropic
 */
export function isAnthropicModel(modelId: string): boolean {
  return ANTHROPIC_MODELS.some(model => model.id === modelId)
}

/**
 * Récupère tous les modèles Anthropic avec raisonnement
 */
export function getReasoningModels(): AnthropicModel[] {
  return ANTHROPIC_MODELS.filter(model => model.reasoning === true)
} 