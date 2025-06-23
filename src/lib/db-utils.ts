import { prisma } from './prisma'

/**
 * Wrapper pour les opérations Prisma avec gestion d'erreurs optimisée pour Vercel
 */
export async function withDb<T>(
  operation: () => Promise<T>,
  retries = 3
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Test de la connexion avant l'opération
      await prisma.$queryRaw`SELECT 1`
      
      // Exécution de l'opération
      const result = await operation()
      
      return result
    } catch (error) {
      lastError = error as Error
      
      console.error(`Tentative ${attempt}/${retries} échouée:`, error)
      
      // Reconnexion en cas d'erreur de connexion
      if (error instanceof Error && error.message.includes('connection')) {
        try {
          await prisma.$disconnect()
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        } catch (disconnectError) {
          console.error('Erreur lors de la déconnexion:', disconnectError)
        }
      }
      
      // Si c'est la dernière tentative, on lance l'erreur
      if (attempt === retries) {
        throw lastError
      }
      
      // Pause avant la prochaine tentative
      await new Promise(resolve => setTimeout(resolve, 500 * attempt))
    }
  }
  
  throw lastError || new Error('Opération échouée après plusieurs tentatives')
}

/**
 * Fonction pour nettoyer les connexions inactives
 */
export async function cleanupConnections() {
  try {
    await prisma.$disconnect()
  } catch (error) {
    console.error('Erreur lors du nettoyage des connexions:', error)
  }
}

/**
 * Fonction de test de santé de la base de données
 */
export async function testDbConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Test de connexion échoué:', error)
    return false
  }
} 