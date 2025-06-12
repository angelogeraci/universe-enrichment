import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/admin/logs : récupère les logs d'enrichissement
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 GET /api/admin/logs - DÉBUT')
    
    // Vérifier que l'utilisateur est admin
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      console.log('❌ ACCÈS NON AUTORISÉ - Role:', session?.user?.role)
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }
    
    // Récupérer les logs (le plus récent en premier)
    const logs = await prisma.enrichmentLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1 // On ne prend que le plus récent puisqu'on supprime les précédents
    })
    
    console.log('📋 Logs trouvés:', logs.length)
    if (logs.length > 0) {
      console.log('📝 Log le plus récent:', {
        id: logs[0].id,
        projectName: logs[0].projectName,
        category: logs[0].category,
        country: logs[0].country,
        model: logs[0].model,
        status: logs[0].responseStatus,
        processingTime: logs[0].processingTime
      })
    }
    
    return NextResponse.json({ logs })
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des logs:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: 'Erreur serveur', details: errorMessage }, { status: 500 })
  }
}

// DELETE /api/admin/logs : supprimer tous les logs
export async function DELETE(req: NextRequest) {
  try {
    console.log('🔍 DELETE /api/admin/logs - DÉBUT')
    
    // Vérifier que l'utilisateur est admin
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      console.log('❌ ACCÈS NON AUTORISÉ - Role:', session?.user?.role)
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }
    
    // Supprimer tous les logs
    const deleteResult = await prisma.enrichmentLog.deleteMany({})
    
    console.log('🗑️ Logs supprimés:', deleteResult.count)
    
    return NextResponse.json({ 
      success: true, 
      message: `${deleteResult.count} log(s) supprimé(s)` 
    })
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des logs:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: 'Erreur serveur', details: errorMessage }, { status: 500 })
  }
} 