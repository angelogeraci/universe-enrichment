import fs from 'fs'
import path from 'path'

export interface FacebookLogEntry {
  timestamp: string
  type: 'AUTO_ENRICHMENT' | 'MANUAL_SEARCH' | 'TOKEN_TEST'
  critere: string
  projectSlug?: string
  projectId?: string
  requestPayload?: any
  responseStatus?: number
  responseHeaders?: Record<string, string>
  responseBody?: any
  errorType?: 'NETWORK' | 'PARSE' | 'FACEBOOK_API' | 'TOKEN_INVALID' | 'RATE_LIMIT' | 'SERVER_ERROR'
  errorMessage?: string
  processingTime: number
  retryAttempt?: number
  maxRetries?: number
  finalResult: 'SUCCESS' | 'FAILED' | 'RETRY'
  suggestions?: Array<{
    label: string
    audience: string
    similarityScore: number
  }>
}

class FacebookLogger {
  private logFile: string
  private isEnabled: boolean = true

  constructor() {
    // Créer le dossier logs s'il n'existe pas
    const logsDir = path.join(process.cwd(), 'logs')
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }

    // Nom de fichier avec timestamp pour éviter les conflits
    const timestamp = new Date().toISOString().split('T')[0]
    this.logFile = path.join(logsDir, `facebook-logs-${timestamp}.json`)
  }

  log(entry: FacebookLogEntry) {
    if (!this.isEnabled) return

    try {
      const logEntry = {
        ...entry,
        timestamp: new Date().toISOString(),
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }

      // Ajouter au fichier de log (format JSONL pour faciliter la lecture)
      const logLine = JSON.stringify(logEntry) + '\n'
      fs.appendFileSync(this.logFile, logLine, 'utf8')

      // Log console pour debugging immédiat
      const shortLog = {
        time: logEntry.timestamp.split('T')[1].split('.')[0],
        type: entry.type,
        critere: entry.critere,
        status: entry.responseStatus,
        result: entry.finalResult,
        suggestions: entry.suggestions?.length || 0
      }
      
      if (entry.finalResult === 'SUCCESS') {
        console.log('📊 FACEBOOK LOG:', shortLog)
      } else if (entry.finalResult === 'RETRY') {
        console.log('🔄 FACEBOOK RETRY:', shortLog)
      } else {
        console.log('❌ FACEBOOK ERROR:', shortLog)
      }

    } catch (error) {
      console.error('Erreur lors de l\'écriture du log Facebook:', error)
    }
  }

  generateSummaryReport(): string {
    try {
      if (!fs.existsSync(this.logFile)) {
        return 'Aucun log Facebook trouvé.'
      }

      const logContent = fs.readFileSync(this.logFile, 'utf8')
      const logs: FacebookLogEntry[] = logContent
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))

      const summary = {
        totalRequests: logs.length,
        successfulRequests: logs.filter(l => l.finalResult === 'SUCCESS').length,
        failedRequests: logs.filter(l => l.finalResult === 'FAILED').length,
        retryRequests: logs.filter(l => l.finalResult === 'RETRY').length,
        autoEnrichment: logs.filter(l => l.type === 'AUTO_ENRICHMENT').length,
        manualSearches: logs.filter(l => l.type === 'MANUAL_SEARCH').length,
        errorTypes: {} as Record<string, number>,
        averageProcessingTime: 0,
        criteresByResult: {
          success: [] as string[],
          failed: [] as string[],
          retry: [] as string[]
        }
      }

      // Analyser les types d'erreurs
      logs.forEach(log => {
        if (log.errorType) {
          summary.errorTypes[log.errorType] = (summary.errorTypes[log.errorType] || 0) + 1
        }
        
        // Grouper par résultat
        if (log.finalResult === 'SUCCESS') {
          summary.criteresByResult.success.push(log.critere)
        } else if (log.finalResult === 'FAILED') {
          summary.criteresByResult.failed.push(log.critere)
        } else if (log.finalResult === 'RETRY') {
          summary.criteresByResult.retry.push(log.critere)
        }
      })

      // Temps de traitement moyen
      const processingTimes = logs.map(l => l.processingTime).filter(t => t > 0)
      summary.averageProcessingTime = processingTimes.length > 0 
        ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length)
        : 0

      return JSON.stringify(summary, null, 2)

    } catch (error) {
      return `Erreur lors de la génération du rapport: ${error}`
    }
  }

  getLogFile(): string {
    return this.logFile
  }

  disable() {
    this.isEnabled = false
  }

  enable() {
    this.isEnabled = true
  }
}

// Instance singleton
export const facebookLogger = new FacebookLogger()

// Fonction utilitaire pour créer une entrée de log
export function createFacebookLogEntry(
  type: FacebookLogEntry['type'],
  critere: string,
  options: Partial<FacebookLogEntry> = {}
): Omit<FacebookLogEntry, 'timestamp' | 'type' | 'critere' | 'processingTime' | 'finalResult'> & {
  startTime: number
} {
  return {
    ...options,
    startTime: Date.now()
  }
}

// Fonction utilitaire pour finaliser une entrée de log
export function finalizeFacebookLogEntry(
  logData: ReturnType<typeof createFacebookLogEntry>,
  finalResult: FacebookLogEntry['finalResult'],
  additionalData: Partial<FacebookLogEntry> = {}
): FacebookLogEntry {
  const processingTime = Date.now() - logData.startTime
  const { startTime, ...rest } = logData

  return {
    ...rest,
    ...additionalData,
    timestamp: new Date().toISOString(),
    processingTime,
    finalResult
  } as FacebookLogEntry
} 