import { NextResponse } from 'next/server'
import { testDbConnection } from '@/lib/db-utils'

export async function GET() {
  try {
    const isHealthy = await testDbConnection()
    
    if (isHealthy) {
      return NextResponse.json({ 
        status: 'healthy', 
        database: 'connected',
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({ 
        status: 'unhealthy', 
        database: 'disconnected',
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json({ 
      status: 'error', 
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 