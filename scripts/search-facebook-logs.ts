import fs from 'fs'
import path from 'path'

interface FacebookLogEntry {
  timestamp: string
  type: 'AUTO_ENRICHMENT' | 'MANUAL_SEARCH' | 'TOKEN_TEST'
  critere: string
  projectSlug?: string
  projectId?: string
  responseStatus?: number
  errorType?: string
  errorMessage?: string
  processingTime: number
  retryAttempt?: number
  finalResult: 'SUCCESS' | 'FAILED' | 'RETRY'
  suggestions?: Array<{
    label: string
    audience: string
    similarityScore: number
  }>
}

function searchLogs(searchTerm: string) {
  const logsDir = path.join(process.cwd(), 'logs')
  
  if (!fs.existsSync(logsDir)) {
    console.log('❌ Dossier logs non trouvé:', logsDir)
    return
  }

  const logFiles = fs.readdirSync(logsDir)
    .filter(file => file.startsWith('facebook-logs-') && file.endsWith('.json'))
    .sort()

  if (logFiles.length === 0) {
    console.log('❌ Aucun fichier de logs Facebook trouvé')
    return
  }

  console.log(`🔍 Recherche de "${searchTerm}" dans ${logFiles.length} fichier(s) de logs...\n`)

  let totalMatches = 0
  let allMatches: FacebookLogEntry[] = []

  for (const logFile of logFiles) {
    const filePath = path.join(logsDir, logFile)
    const content = fs.readFileSync(filePath, 'utf8')
    
    const logs: FacebookLogEntry[] = content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter(log => log !== null)

    const matches = logs.filter(log => 
      log.critere.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (matches.length > 0) {
      console.log(`📁 ${logFile}: ${matches.length} résultat(s)`)
      allMatches.push(...matches)
      totalMatches += matches.length
    }
  }

  if (totalMatches === 0) {
    console.log(`❌ Aucun résultat trouvé pour "${searchTerm}"`)
    return
  }

  console.log(`\n✅ Total: ${totalMatches} résultat(s) trouvé(s)\n`)

  // Trier par timestamp
  allMatches.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  // Afficher tous les résultats
  allMatches.forEach((log, index) => {
    console.log(`--- RÉSULTAT ${index + 1}/${totalMatches} ---`)
    console.log(`🕐 Timestamp: ${new Date(log.timestamp).toLocaleString('fr-FR')}`)
    console.log(`🏷️  Critère: ${log.critere}`)
    console.log(`🔧 Type: ${log.type}`)
    console.log(`📊 Résultat: ${log.finalResult}`)
    
    if (log.projectSlug) {
      console.log(`📁 Projet: ${log.projectSlug}`)
    }
    
    if (log.responseStatus) {
      console.log(`🌐 Status HTTP: ${log.responseStatus}`)
    }
    
    if (log.retryAttempt !== undefined && log.retryAttempt > 0) {
      console.log(`🔄 Tentative: ${log.retryAttempt + 1}`)
    }
    
    console.log(`⏱️  Temps de traitement: ${log.processingTime}ms`)
    
    if (log.suggestions && log.suggestions.length > 0) {
      console.log(`💡 Suggestions: ${log.suggestions.length}`)
      log.suggestions.forEach((suggestion, i) => {
        console.log(`   ${i + 1}. ${suggestion.label} (${suggestion.audience} personnes, score: ${suggestion.similarityScore}%)`)
      })
    }
    
    if (log.errorType && log.errorMessage) {
      console.log(`❌ Erreur (${log.errorType}): ${log.errorMessage}`)
    }
    
    console.log('')
  })

  // Analyser les patterns
  console.log('--- ANALYSE ---')
  const autoLogs = allMatches.filter(log => log.type === 'AUTO_ENRICHMENT')
  const manualLogs = allMatches.filter(log => log.type === 'MANUAL_SEARCH')
  const successLogs = allMatches.filter(log => log.finalResult === 'SUCCESS')
  const failedLogs = allMatches.filter(log => log.finalResult === 'FAILED')

  console.log(`📈 Enrichissement automatique: ${autoLogs.length}`)
  console.log(`🖱️  Recherche manuelle: ${manualLogs.length}`)
  console.log(`✅ Succès: ${successLogs.length}`)
  console.log(`❌ Échecs: ${failedLogs.length}`)

  if (autoLogs.length > 0) {
    const autoSuccess = autoLogs.filter(log => log.finalResult === 'SUCCESS').length
    console.log(`📊 Taux de succès automatique: ${((autoSuccess / autoLogs.length) * 100).toFixed(1)}%`)
  }

  if (manualLogs.length > 0) {
    const manualSuccess = manualLogs.filter(log => log.finalResult === 'SUCCESS').length
    console.log(`📊 Taux de succès manuel: ${((manualSuccess / manualLogs.length) * 100).toFixed(1)}%`)
  }

  // Suggestions trouvées
  const allSuggestions = allMatches
    .filter(log => log.suggestions && log.suggestions.length > 0)
    .map(log => log.suggestions!)
    .flat()

  if (allSuggestions.length > 0) {
    console.log(`\n💡 Total de suggestions uniques trouvées: ${allSuggestions.length}`)
    console.log('🏆 Top 5 suggestions:')
    
    const suggestionCounts: Record<string, number> = {}
    allSuggestions.forEach(suggestion => {
      suggestionCounts[suggestion.label] = (suggestionCounts[suggestion.label] || 0) + 1
    })

    const topSuggestions = Object.entries(suggestionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)

    topSuggestions.forEach(([label, count], index) => {
      const suggestion = allSuggestions.find(s => s.label === label)
      console.log(`   ${index + 1}. ${label} (${suggestion?.audience} personnes) - Trouvé ${count} fois`)
    })
  }
}

// Récupérer l'argument de ligne de commande
const searchTerm = process.argv[2]

if (!searchTerm) {
  console.log('Usage: npm run search-logs <terme_de_recherche>')
  console.log('Exemple: npm run search-logs "Adnan Januzaj"')
  process.exit(1)
}

searchLogs(searchTerm) 