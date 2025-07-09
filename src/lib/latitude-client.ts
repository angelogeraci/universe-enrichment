/**
 * Client pour intégrer Latitude.so
 * Remplace le système de prompts local par des prompts hébergés sur Latitude.so
 */

interface LatitudeConfig {
  apiKey: string
  projectId: string
  baseUrl?: string
  versionUuid?: string
}

interface RunDocumentParams {
  path: string
  parameters?: Record<string, any>
  stream?: boolean
}

interface CreateDocumentParams {
  path: string
  prompt?: string
}

interface LatitudeDocument {
  id: string
  documentUuid: string
  path: string
  content: string
  resolvedContent: string
  contentHash: string
  commitId: string
  projectId: string
  config: {
    provider: string
    model: string
  }
}

interface LatitudeRunResponse {
  uuid: string
  conversation: any[]
  response: {
    streamType: 'text' | 'object'
    usage: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
    text: string
    object?: any
    toolCalls: any[]
  }
}

interface LatitudeResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export class LatitudeClient {
  private apiKey: string
  private projectId: string
  private baseUrl: string
  private versionUuid: string

  constructor(config: LatitudeConfig) {
    this.apiKey = config.apiKey
    this.projectId = config.projectId
    // Utiliser l'URL officielle de l'API v3
    this.baseUrl = config.baseUrl || 'https://gateway.latitude.so/api/v3'
    // Utiliser 'live' par défaut selon la documentation
    this.versionUuid = config.versionUuid || 'live'
  }

  private async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<LatitudeResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    
    console.log(`🌐 Latitude API Request: ${method} ${url}`)
    if (body) {
      console.log('📤 Request body:', JSON.stringify(body, null, 2))
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      console.log(`📈 Response status: ${response.status}`)
      
      const responseText = await response.text()
      console.log(`📥 Response body: ${responseText}`)

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${responseText}`,
        }
      }

      let data: T
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        data = responseText as any
      }

      return {
        success: true,
        data,
      }
    } catch (error) {
      console.error('❌ Latitude API Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Récupère un document par son chemin
   */
  async getDocument(path: string): Promise<LatitudeResponse<LatitudeDocument>> {
    const endpoint = `/projects/${this.projectId}/versions/${this.versionUuid}/documents/${path}`
    return this.makeRequest<LatitudeDocument>(endpoint, 'GET')
  }

  /**
   * Crée ou récupère un document
   */
  async getOrCreateDocument(params: CreateDocumentParams): Promise<LatitudeResponse<LatitudeDocument>> {
    const endpoint = `/projects/${this.projectId}/versions/${this.versionUuid}/documents/get-or-create`
    return this.makeRequest<LatitudeDocument>(endpoint, 'POST', params)
  }

  /**
   * Exécute un document (prompt) avec des paramètres
   */
  async runDocument(params: RunDocumentParams): Promise<LatitudeResponse<LatitudeRunResponse>> {
    const endpoint = `/projects/${this.projectId}/versions/${this.versionUuid}/documents/run`
    
    const body = {
      path: params.path,
      parameters: params.parameters || {},
      stream: params.stream || false
    }
    
    return this.makeRequest<LatitudeRunResponse>(endpoint, 'POST', body)
  }

  /**
   * Test de santé
   */
  async healthCheck(): Promise<LatitudeResponse<{status: string}>> {
    // Utiliser l'endpoint de base pour le health check
    const response = await fetch('https://gateway.latitude.so/health')
    const data = await response.json()
    
    return {
      success: response.ok,
      data: data
    }
  }

  /**
   * Liste tous les documents (simulation pour les tests)
   */
  async listDocuments(): Promise<LatitudeResponse<string[]>> {
    // Cette fonction est pour les tests - on essaie de récupérer des documents connus
    const commonPaths = [
      'criteres-originaires-uniquement',
      'criteres-originaires-et-presents',
      'prompt-origin',
      'prompt-presence'
    ]
    
    const foundDocuments: string[] = []
    
    for (const path of commonPaths) {
      const result = await this.getDocument(path)
      if (result.success) {
        foundDocuments.push(path)
      }
    }
    
    return {
      success: true,
      data: foundDocuments
    }
  }
}

/**
 * Factory function pour créer un client Latitude.so
 */
export function createLatitudeClient(config?: Partial<LatitudeConfig>): LatitudeClient {
  const apiKey = config?.apiKey || process.env.LATITUDE_API_KEY
  const projectId = config?.projectId || process.env.LATITUDE_PROJECT_ID

  if (!apiKey || !projectId) {
    throw new Error(
      'LATITUDE_API_KEY et LATITUDE_PROJECT_ID doivent être définis dans les variables d\'environnement'
    )
  }

  return new LatitudeClient({
    apiKey,
    projectId,
    ...config,
  })
} 