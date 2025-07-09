import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { isAnthropicModel } from './anthropic-models'

// Interfaces unifiées
export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  content: string
  model: string
  usage?: {
    inputTokens?: number
    outputTokens?: number
  }
  reasoning?: string // Pour les modèles avec capacité de raisonnement
}

export interface AICompletionOptions {
  model: string
  messages: AIMessage[]
  maxTokens?: number
  temperature?: number
  thinking?: boolean // Pour les modèles Claude avec thinking
}

// Clients configurés
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
})

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

/**
 * Fonction unifiée pour appeler les modèles IA
 */
export async function callAIModel(options: AICompletionOptions): Promise<AIResponse> {
  const { model, messages, maxTokens = 4096, temperature = 0.7, thinking = false } = options

  // Vérifier que nous avons les clés API nécessaires
  if (isAnthropicModel(model)) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Clé API Anthropic manquante')
    }
  } else {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Clé API OpenAI manquante')
    }
  }

  try {
    if (isAnthropicModel(model)) {
      // Appel Anthropic Claude
      console.log(`🤖 APPEL ANTHROPIC: ${model}`)
      
      // Convertir les messages pour Anthropic
      const systemMessage = messages.find(m => m.role === 'system')
      const userMessages = messages.filter(m => m.role !== 'system')
      
      // Configuration de base pour Anthropic
      const anthropicOptions: any = {
        model,
        max_tokens: maxTokens,
        messages: userMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }))
      }

      // Ajouter le message système si présent
      if (systemMessage) {
        anthropicOptions.system = systemMessage.content
      }

      // Ajouter les options de thinking pour Claude 3.7+
      if (thinking && (model.includes('3-7') || model.includes('4'))) {
        anthropicOptions.thinking = {
          type: 'enabled',
          budget_tokens: 12000
        }
      }

      const response = await anthropic.messages.create(anthropicOptions)
      
      console.log(`✅ ANTHROPIC RÉPONSE REÇUE`)
      
      // Extraire le contenu principal
      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('')

      // Extraire le reasoning si disponible (propriété expérimentale)
      const reasoning = (response as any).thinking ? (response as any).thinking : undefined

      return {
        content,
        model,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        },
        reasoning
      }
      
    } else {
      // Appel OpenAI
      console.log(`🤖 APPEL OPENAI: ${model}`)
      
      const completion = await openai.chat.completions.create({
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        max_tokens: maxTokens,
        temperature
      })
      
      console.log(`✅ OPENAI RÉPONSE REÇUE`)
      
      const content = completion.choices[0]?.message?.content || ''
      
      return {
        content,
        model,
        usage: {
          inputTokens: completion.usage?.prompt_tokens,
          outputTokens: completion.usage?.completion_tokens
        }
      }
    }
  } catch (error) {
    console.error(`❌ ERREUR APPEL ${isAnthropicModel(model) ? 'ANTHROPIC' : 'OPENAI'}:`, error)
    
    // Gérer les erreurs spécifiques
    if (error instanceof Error) {
      if (error.message.includes('rate_limit')) {
        throw new Error('Limite de taux API atteinte. Veuillez réessayer plus tard.')
      } else if (error.message.includes('invalid_api_key')) {
        throw new Error('Clé API invalide')
      } else if (error.message.includes('insufficient_quota')) {
        throw new Error('Quota API insuffisant')
      }
    }
    
    throw new Error(`Erreur lors de l'appel au modèle ${model}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
  }
}

/**
 * Fonction helper pour vérifier la disponibilité des clés API
 */
export function checkAPIKeys(): { openai: boolean; anthropic: boolean } {
  return {
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY
  }
}

/**
 * Fonction helper pour obtenir les modèles disponibles selon les clés API
 */
export async function getAvailableModels() {
  const keys = checkAPIKeys()
  const availableModels: string[] = []
  
  if (keys.openai) {
    // Ajouter les modèles OpenAI
    availableModels.push('gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo')
  }
  
  if (keys.anthropic) {
    // Ajouter les modèles Anthropic
    availableModels.push(
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-20240620', 
      'claude-3-5-haiku-20241022',
      'claude-3-7-sonnet-20250219',
      'claude-4-sonnet-20250522'
    )
  }
  
  return availableModels
} 