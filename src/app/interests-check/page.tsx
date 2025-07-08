"use client"

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileCheck, Plus, Upload, Calendar, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'

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

export default function InterestChecksPage() {
  const { data: session, status } = useSession()
  const [interestChecks, setInterestChecks] = useState<InterestCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Redirection si non authentifié
  if (status === 'loading') return <div>Chargement...</div>
  if (!session) redirect('/login')

  useEffect(() => {
    fetchInterestChecks()
  }, [])

  const fetchInterestChecks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/interests-check')
      if (response.ok) {
        const data = await response.json()
        setInterestChecks(data.interestChecks || [])
      } else {
        setError('Erreur lors du chargement des Interest Checks')
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-amber-600" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'done':
        return 'Terminé'
      case 'processing':
        return 'En cours'
      case 'pending':
        return 'En attente'
      case 'failed':
        return 'Échec'
      default:
        return 'Inconnu'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-amber-100 text-amber-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
            <p className="text-gray-600">Chargement des Interest Checks...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FileCheck className="h-8 w-8 text-blue-600" />
          Interest Checks
        </h1>
        <p className="text-gray-600 mt-2">
          Analysez les suggestions Facebook à partir de fichiers Excel
        </p>
      </div>

      <div className="mb-6">
        <Link href="/interests-check/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Créer un Interest Check
          </Button>
        </Link>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {interestChecks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Upload className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucun Interest Check trouvé
              </h3>
              <p className="text-gray-600 mb-6">
                Commencez par créer votre premier Interest Check à partir d'un fichier Excel.
              </p>
              <Link href="/interests-check/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer votre premier Interest Check
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {interestChecks.map((interestCheck) => (
            <Card key={interestCheck.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href={`/interests-check/${interestCheck.slug}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-blue-600" />
                      {interestCheck.name}
                    </CardTitle>
                    <Badge className={getStatusColor(interestCheck.enrichmentStatus)}>
                      {getStatusIcon(interestCheck.enrichmentStatus)}
                      <span className="ml-1">{getStatusText(interestCheck.enrichmentStatus)}</span>
                    </Badge>
                  </div>
                  {interestCheck.description && (
                    <CardDescription className="mt-2">
                      {interestCheck.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Upload className="h-4 w-4" />
                      <span>{interestCheck.fileName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{interestCheck._count.interests} intérêts</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">Pays:</span>
                      <Badge variant="outline">{interestCheck.country}</Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(interestCheck.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 