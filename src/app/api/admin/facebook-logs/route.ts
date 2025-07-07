import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { facebookLogger } from '@/lib/facebook-logger'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'summary') {
      // Retourner un résumé des logs
      const summary = facebookLogger.generateSummaryReport()
      return NextResponse.json({ summary })
    }

    if (action === 'download') {
      // Télécharger le fichier de logs complet
      const logFile = facebookLogger.getLogFile()
      
      if (!fs.existsSync(logFile)) {
        return NextResponse.json({ error: 'Aucun fichier de logs trouvé' }, { status: 404 })
      }

      const logContent = fs.readFileSync(logFile, 'utf8')
      const fileName = path.basename(logFile)

      return new NextResponse(logContent, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'no-cache'
        }
      })
    }

    if (action === 'analyze') {
      // Analyser les logs pour identifier les problèmes spécifiques
      const logFile = facebookLogger.getLogFile()
      
      if (!fs.existsSync(logFile)) {
        return NextResponse.json({ error: 'Aucun fichier de logs trouvé' }, { status: 404 })
      }

      const logContent = fs.readFileSync(logFile, 'utf8')
      const logs = logContent
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))

      // Analyser les différences entre AUTO_ENRICHMENT et MANUAL_SEARCH
      const autoEnrichmentLogs = logs.filter(l => l.type === 'AUTO_ENRICHMENT')
      const manualSearchLogs = logs.filter(l => l.type === 'MANUAL_SEARCH')

      // Trouver les critères qui échouent en auto mais réussissent en manuel
      const critereComparisons: Record<string, {
        auto: any[],
        manual: any[],
        autoSuccess: boolean,
        manualSuccess: boolean,
        issue?: string
      }> = {}

             // Grouper par critère
       const allLogs = [...autoEnrichmentLogs, ...manualSearchLogs]
       allLogs.forEach((log: any) => {
        if (!critereComparisons[log.critere]) {
          critereComparisons[log.critere] = {
            auto: [],
            manual: [],
            autoSuccess: false,
            manualSuccess: false
          }
        }

        if (log.type === 'AUTO_ENRICHMENT') {
          critereComparisons[log.critere].auto.push(log)
          if (log.finalResult === 'SUCCESS') {
            critereComparisons[log.critere].autoSuccess = true
          }
        } else {
          critereComparisons[log.critere].manual.push(log)
          if (log.finalResult === 'SUCCESS') {
            critereComparisons[log.critere].manualSuccess = true
          }
        }
      })

             // Identifier les problèmes
       const problematicCriteres = Object.entries(critereComparisons)
         .filter(([critere, data]: [string, any]) => 
           data.auto.length > 0 && // A été testé en auto
           !data.autoSuccess && // N'a pas réussi en auto
           (data.manual.length === 0 || data.manualSuccess) // Soit pas testé en manuel, soit réussi en manuel
         )
                 .map(([critere, data]: [string, any]) => {
          let issue = 'Échec en enrichissement automatique'
          
          if (data.manual.length > 0 && data.manualSuccess) {
            issue = 'Échec en auto mais succès en manuel - Problème potentiel de token/headers'
          }
          
          const lastAutoLog = data.auto[data.auto.length - 1]
          
          return {
            critere,
            issue,
            autoAttempts: data.auto.length,
            manualAttempts: data.manual.length,
            lastAutoError: lastAutoLog?.errorMessage,
            lastAutoErrorType: lastAutoLog?.errorType,
            suggestions: [...data.auto, ...data.manual]
              .filter(log => log.suggestions && log.suggestions.length > 0)
              .map(log => log.suggestions).flat()
          }
        })

      // Statistiques globales
      const analysis = {
        totalLogs: logs.length,
        autoEnrichmentLogs: autoEnrichmentLogs.length,
        manualSearchLogs: manualSearchLogs.length,
        successRateAuto: autoEnrichmentLogs.length > 0 
          ? (autoEnrichmentLogs.filter(l => l.finalResult === 'SUCCESS').length / autoEnrichmentLogs.length * 100).toFixed(1)
          : 0,
        successRateManual: manualSearchLogs.length > 0
          ? (manualSearchLogs.filter(l => l.finalResult === 'SUCCESS').length / manualSearchLogs.length * 100).toFixed(1) 
          : 0,
        critereCount: Object.keys(critereComparisons).length,
        problematicCriteres,
        commonErrors: getCommonErrors(logs),
        timeline: getTimelineAnalysis(logs)
      }

      return NextResponse.json({ analysis })
    }

    // Par défaut, retourner la liste des logs récents
    const logFile = facebookLogger.getLogFile()
    
    if (!fs.existsSync(logFile)) {
      return NextResponse.json({ 
        logs: [],
        message: 'Aucun fichier de logs trouvé'
      })
    }

    const logContent = fs.readFileSync(logFile, 'utf8')
    const logs = logContent
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line))
      .slice(-100) // Derniers 100 logs seulement

    return NextResponse.json({ logs })

  } catch (error) {
    console.error('Erreur lors de la récupération des logs Facebook:', error)
    return NextResponse.json({ 
      error: 'Erreur lors de la récupération des logs Facebook',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 })
  }
}

function getCommonErrors(logs: any[]) {
  const errorCounts: Record<string, number> = {}
  
  logs.filter(log => log.errorMessage).forEach(log => {
    const errorKey = `${log.errorType || 'UNKNOWN'}: ${log.errorMessage?.substring(0, 100) || 'Unknown error'}`
    errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1
  })

  return Object.entries(errorCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([error, count]) => ({ error, count }))
}

function getTimelineAnalysis(logs: any[]) {
  const hourlyStats: Record<string, { success: number, failed: number, retry: number }> = {}
  
  logs.forEach(log => {
    const hour = new Date(log.timestamp).toISOString().substring(0, 13) // YYYY-MM-DDTHH
    
    if (!hourlyStats[hour]) {
      hourlyStats[hour] = { success: 0, failed: 0, retry: 0 }
    }
    
    if (log.finalResult === 'SUCCESS') {
      hourlyStats[hour].success++
    } else if (log.finalResult === 'FAILED') {
      hourlyStats[hour].failed++
    } else if (log.finalResult === 'RETRY') {
      hourlyStats[hour].retry++
    }
  })

  return Object.entries(hourlyStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, stats]) => ({
      hour,
      ...stats,
      total: stats.success + stats.failed + stats.retry
    }))
} 