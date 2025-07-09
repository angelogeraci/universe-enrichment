/**
 * API Route pour l'enrichissement avec Latitude.so
 * Alternative à l'API d'enrichissement locale
 */

import { NextRequest, NextResponse } from 'next/server';
import { enrichWithLatitudeSo, testLatitudeConnection } from '@/lib/enrichment-latitude';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, country, searchType, additionalContext } = body;

    // Validation des paramètres requis
    if (!category || !country || !searchType) {
      return NextResponse.json(
        { error: 'Paramètres manquants: category, country et searchType sont requis' },
        { status: 400 }
      );
    }

    // Validation du type de recherche
    if (!['origin', 'presence'].includes(searchType)) {
      return NextResponse.json(
        { error: 'searchType doit être "origin" ou "presence"' },
        { status: 400 }
      );
    }

    // Effectuer l'enrichissement avec Latitude.so
    const result = await enrichWithLatitudeSo({
      category,
      country,
      searchType,
      additionalContext
    });

    return NextResponse.json({
      success: true,
      data: result,
      provider: 'latitude.so',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur API enrichissement Latitude:', error);
    
    return NextResponse.json(
      {
        error: 'Erreur lors de l\'enrichissement',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
        provider: 'latitude.so'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Test de la connexion Latitude.so
    const isConnected = await testLatitudeConnection();
    
    if (!isConnected) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Impossible de se connecter à Latitude.so',
          connected: false
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Connexion à Latitude.so réussie',
      connected: true,
      provider: 'latitude.so',
      endpoints: {
        enrich: '/api/enrichment-latitude',
        test: '/api/enrichment-latitude'
      }
    });

  } catch (error) {
    console.error('Erreur lors du test de connexion:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Erreur lors du test de connexion',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
        connected: false
      },
      { status: 500 }
    );
  }
} 