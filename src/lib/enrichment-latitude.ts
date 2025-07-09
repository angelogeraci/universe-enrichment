/**
 * Service d'enrichissement utilisant Latitude.so
 * Utilise les prompts existants sur Latitude.so via leurs UUIDs
 */

import { createLatitudeClient } from './latitude-client';

export interface EnrichmentRequest {
  category: string;
  country: string;
  searchType: 'origin' | 'presence';
  additionalContext?: string;
}

export interface EnrichmentResult {
  criteria: string[];
  metadata: {
    promptUsed: string;
    model: string;
    country: string;
    category: string;
    searchType: string;
    conversationUuid?: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
}

/**
 * Mappe les types de recherche vers les paths des prompts existants sur Latitude.so
 * Basé sur l'exploration du projet via l'API
 */
const PROMPT_PATH_MAPPING = {
  origin: 'CriteriaDiscoverOriginOnly',      // Path trouvé: UUID 0f79598d-d64c-4e74-991b-73109453c05e
  presence: 'CriteriaDiscoverOriginPresent'  // Path trouvé: UUID ad589079-f496-4c3d-a914-f42745fafa03
} as const;

/**
 * UUIDs de référence pour les prompts (pour documentation)
 */
const PROMPT_UUID_REFERENCE = {
  origin: '0f79598d-d64c-4e74-991b-73109453c05e',      // Prompt "CriteriaDiscoverOriginOnly"
  presence: 'ad589079-f496-4c3d-a914-f42745fafa03'    // Prompt "CriteriaDiscoverOriginPresent"
} as const;

/**
 * Service principal d'enrichissement avec Latitude.so
 */
export class LatitudeEnrichmentService {
  private client = createLatitudeClient();

  /**
   * Enrichit les critères en utilisant les prompts existants sur Latitude.so
   */
  async enrichCriteria(request: EnrichmentRequest): Promise<EnrichmentResult> {
    console.log('🚀 Début enrichissement Latitude.so:', request);

    try {
      const promptPath = PROMPT_PATH_MAPPING[request.searchType];
      console.log(`📋 Utilisation du prompt path: ${promptPath} (${request.searchType})`);

      // Préparer les paramètres pour le prompt
      const parameters = {
        country: request.country,
        category: request.category,
        ...(request.additionalContext && { context: request.additionalContext })
      };

      console.log('📤 Paramètres envoyés:', parameters);

      // Exécuter le prompt existant sur Latitude.so
      const result = await this.client.runDocument({
        path: promptPath, // Utiliser le path comme path
        parameters,
        stream: false
      });

      if (!result.success) {
        throw new Error(`Échec de l'exécution du prompt: ${result.error}`);
      }

      console.log('✅ Réponse reçue de Latitude.so:', result.data);

      // Parser la réponse
      const criteria = this.parseCriteriaFromResponse(result.data!.response.text);

      const enrichmentResult: EnrichmentResult = {
        criteria,
        metadata: {
          promptUsed: promptPath,
          model: 'latitude-managed', // Latitude.so gère le modèle
          country: request.country,
          category: request.category,
          searchType: request.searchType,
          conversationUuid: result.data!.uuid,
          usage: result.data!.response.usage
        }
      };

      console.log('🎉 Enrichissement terminé:', enrichmentResult);
      return enrichmentResult;

    } catch (error) {
      console.error('❌ Erreur dans enrichissement Latitude.so:', error);
      throw error;
    }
  }

  /**
   * Parse les critères depuis la réponse du prompt
   */
  private parseCriteriaFromResponse(responseText: string): string[] {
    try {
      // Essayer de parser directement comme JSON
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => typeof item === 'string' && item.trim().length > 0);
      }
    } catch (e) {
      // Si ce n'est pas du JSON direct, chercher un tableau JSON dans le texte
      const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            return parsed.filter(item => typeof item === 'string' && item.trim().length > 0);
          }
        } catch (e2) {
          // Fallback: parser ligne par ligne
        }
      }
    }

    // Fallback: extraire les critères ligne par ligne
    return responseText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('//'))
      .map(line => line.replace(/^[-*•]\s*/, '').replace(/^"\s*/, '').replace(/\s*"$/, ''))
      .filter(line => line.length > 3);
  }

  /**
   * Test de connexion et des prompts existants
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔍 Test de connexion Latitude.so...');

      // Test 1: Health check
      const healthResult = await this.client.healthCheck();
      if (!healthResult.success) {
        return {
          success: false,
          message: `Health check échoué: ${healthResult.error}`
        };
      }

      console.log('✅ Health check OK');

      // Test 2: Tester l'accès aux prompts existants
      for (const [searchType, promptPath] of Object.entries(PROMPT_PATH_MAPPING)) {
        console.log(`🧪 Test du prompt ${searchType}: ${promptPath}`);
        
        const testResult = await this.client.runDocument({
          path: promptPath,
          parameters: {
            country: 'France',
            category: 'Test'
          },
          stream: false
        });

        if (!testResult.success) {
          return {
            success: false,
            message: `Test du prompt ${searchType} échoué: ${testResult.error}`
          };
        }

        console.log(`✅ Prompt ${searchType} accessible`);
      }

      return {
        success: true,
        message: 'Connexion Latitude.so et prompts existants fonctionnels'
      };

    } catch (error) {
      return {
        success: false,
        message: `Erreur de connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  /**
   * Récupère les informations des prompts configurés
   */
  getConfiguredPrompts() {
    return Object.entries(PROMPT_PATH_MAPPING).map(([searchType, path]) => ({
      searchType,
      path,
      description: searchType === 'origin' 
        ? 'Critères originaires uniquement du pays' 
        : 'Critères originaires ET présents dans le pays'
    }));
  }
}

/**
 * Instance singleton du service
 */
let enrichmentService: LatitudeEnrichmentService | null = null;

export function getLatitudeEnrichmentService(): LatitudeEnrichmentService {
  if (!enrichmentService) {
    enrichmentService = new LatitudeEnrichmentService();
  }
  return enrichmentService;
}

/**
 * Fonction helper pour l'enrichissement (compatible avec l'API existante)
 */
export async function enrichWithLatitudeSo(request: EnrichmentRequest): Promise<EnrichmentResult> {
  const service = getLatitudeEnrichmentService();
  return service.enrichCriteria(request);
}

/**
 * Fonction helper pour tester la connexion (compatible avec l'API existante)
 */
export async function testLatitudeConnection(): Promise<boolean> {
  try {
    const service = getLatitudeEnrichmentService();
    const result = await service.testConnection();
    return result.success;
  } catch (error) {
    console.error('Erreur lors du test de connexion:', error);
    return false;
  }
} 