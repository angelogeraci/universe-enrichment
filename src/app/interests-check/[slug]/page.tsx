"use client"

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileCheck, Users, MapPin, Calendar } from 'lucide-react'
import Link from 'next/link'
import { InterestCheckResultsClient } from '@/components/InterestCheckResultsClient'

interface InterestCheck {
  id: string
  name: string
  slug: string
  description: string | null
  country: string
  fileName: string
  createdAt: string
  enrichmentStatus: string
  _count: {
    interests: number
  }
}

export default function InterestCheckDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const slug = params.slug as string

  const [interestCheck, setInterestCheck] = useState<InterestCheck | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch Interest Check data
  useEffect(() => {
    if (!session || !slug) return

    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch Interest Check details
        const checkResponse = await fetch(`/api/interests-check/${slug}`)
        if (checkResponse.ok) {
          const checkData = await checkResponse.json()
          setInterestCheck(checkData.interestCheck)
        }

      } catch (error) {
        console.error('Erreur lors du chargement:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [session, slug])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>
      case 'in_progress':
        return <Badge variant="default">En cours</Badge>
      case 'done':
        return <Badge className="bg-green-500 text-white border-green-600">Terminé</Badge>
      case 'paused':
        return <Badge variant="outline">En pause</Badge>
      case 'failed':
        return <Badge variant="destructive">Échoué</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="w-full px-32 py-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-lg">Chargement...</div>
        </div>
      </div>
    )
  }

  if (!interestCheck) {
    return (
      <div className="w-full px-32 py-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-lg text-red-500">Interest Check non trouvé</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-32 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/interests-check">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{interestCheck.name}</h1>
          {getStatusBadge(interestCheck.enrichmentStatus)}
        </div>

        {/* Grille à 4 colonnes pour aligner avec les projets */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full">
          {/* Card Détails de l'Interest Check */}
          <div className="bg-white rounded-lg border p-6 flex flex-col justify-between h-full">
            <h2 className="text-lg font-semibold mb-2">Détails de l'Interest Check</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span><span className="font-medium">Pays :</span> {interestCheck.country}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-muted-foreground" />
                <span><span className="font-medium">Fichier :</span> {interestCheck.fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span><span className="font-medium">Intérêts :</span> {interestCheck._count.interests}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span><span className="font-medium">Créé le :</span> {new Date(interestCheck.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
              {interestCheck.description && (
                <div className="mt-2 pt-2 border-t">
                  <span className="font-medium">Description :</span>
                  <p className="text-muted-foreground mt-1">{interestCheck.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Cards de métriques alignées */}
          <div className="col-span-1 flex flex-col h-full md:col-span-3">
            <InterestCheckResultsClient 
              slug={interestCheck.slug} 
              enrichmentStatus={interestCheck.enrichmentStatus as any} 
              totalInterests={interestCheck._count.interests}
              onlyMetrics 
            />
          </div>
        </div>

        {/* Barre de progression + zone tableau */}
        <InterestCheckResultsClient 
          slug={interestCheck.slug} 
          enrichmentStatus={interestCheck.enrichmentStatus as any} 
          totalInterests={interestCheck._count.interests}
          onlyProgress 
        />
      </div>
    </div>
  )
} 