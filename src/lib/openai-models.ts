export interface OpenAIModel {
  id: string
  name: string
  description: string
  category: 'GPT-4' | 'GPT-3.5' | 'Reasoning' | 'latest' | 'reasoning' | 'standard' | 'legacy'
  recommended?: boolean
  maxTokens: number
  inputCost: number
  outputCost: number
}

export const OPENAI_MODELS: OpenAIModel[] = [
  // Modèles les plus récents (2024-2025)
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Multimodal flagship model that\'s cheaper and faster than GPT-4 Turbo',
    maxTokens: 128000,
    inputCost: 0.000005,
    outputCost: 0.000015,
    category: 'GPT-4'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    description: 'Affordable and intelligent small model for fast, lightweight tasks',
    maxTokens: 128000,
    inputCost: 0.00000015,
    outputCost: 0.0000006,
    category: 'GPT-4'
  },
  {
    id: 'o3-mini',
    name: 'o3-mini',
    description: 'Most capable reasoning model for advanced problem-solving',
    maxTokens: 200000,
    inputCost: 0.0000012,
    outputCost: 0.0000048,
    category: 'Reasoning'
  },
  {
    id: 'o4-mini',
    name: 'o4-mini',
    description: 'Fast, efficient reasoning model with multimodal capabilities',
    maxTokens: 200000,
    inputCost: 0.00000116,
    outputCost: 0.00000462,
    category: 'Reasoning'
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    description: 'Flagship model optimized for advanced instruction following and coding',
    maxTokens: 1048576,
    inputCost: 0.000002,
    outputCost: 0.000008,
    category: 'GPT-4'
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 mini',
    description: 'Compact version of GPT-4.1 for efficient performance',
    maxTokens: 200000,
    inputCost: 0.0000008,
    outputCost: 0.0000024,
    category: 'GPT-4'
  },
  {
    id: 'gpt-4.1-nano',
    name: 'GPT-4.1 nano',
    description: 'Ultra-efficient version for basic tasks with very low cost',
    maxTokens: 32000,
    inputCost: 0.0000002,
    outputCost: 0.0000008,
    category: 'GPT-4'
  },
  {
    id: 'chatgpt-4o-latest',
    name: 'ChatGPT-4o latest',
    description: 'Points to the most current snapshot of GPT-4o',
    maxTokens: 128000,
    inputCost: 0.000005,
    outputCost: 0.000015,
    category: 'GPT-4'
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'The latest GPT-4 Turbo model with vision capabilities',
    maxTokens: 128000,
    inputCost: 0.00001,
    outputCost: 0.00003,
    category: 'GPT-4'
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'Large multimodal model that can solve difficult problems',
    maxTokens: 8192,
    inputCost: 0.00003,
    outputCost: 0.00006,
    category: 'GPT-4'
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Fast, inexpensive model for simple tasks',
    maxTokens: 16385,
    inputCost: 0.0000005,
    outputCost: 0.0000015,
    category: 'GPT-3.5'
  },
  {
    id: 'o1-preview',
    name: 'o1-preview',
    description: 'Reasoning model designed to solve hard problems across domains',
    maxTokens: 128000,
    inputCost: 0.000015,
    outputCost: 0.00006,
    category: 'Reasoning'
  },
  {
    id: 'o1-mini',
    name: 'o1-mini',
    description: 'Faster and cheaper reasoning model that\'s particularly good at coding',
    maxTokens: 128000,
    inputCost: 0.000003,
    outputCost: 0.000012,
    category: 'Reasoning'
  },
  {
    id: 'o1-pro',
    name: 'o1-pro',
    description: 'Enhanced reasoning model with increased compute and capabilities',
    maxTokens: 128000,
    inputCost: 0.00006,
    outputCost: 0.00024,
    category: 'Reasoning'
  }
]

export const OPENAI_MODEL_CATEGORIES = [
  'GPT-4',
  'GPT-3.5',
  'Reasoning'
]

export function getModelsByCategory(category: string) {
  return OPENAI_MODELS.filter(model => model.category === category)
}

export function getModelById(id: string) {
  return OPENAI_MODELS.find(model => model.id === id)
}

export function getLatestModel() {
  return OPENAI_MODELS.find(model => model.id === 'gpt-4o')
} 