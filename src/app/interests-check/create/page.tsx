"use client"

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FileCheck, Upload, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CreateInterestCheckPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    country: 'BE'
  })
  
  const [file, setFile] = useState<File | null>(null)

  // Redirection si non authentifié
  if (status === 'loading') return <div>Chargement...</div>
  if (!session) redirect('/login')

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Vérifier que c'est un fichier Excel
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel' // .xls
      ]
      
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)')
        return
      }
      
      setFile(selectedFile)
      setError(null)
      
      // Auto-fill le nom si vide
      if (!formData.name) {
        const nameWithoutExtension = selectedFile.name.replace(/\.[^/.]+$/, '')
        setFormData(prev => ({ ...prev, name: nameWithoutExtension }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validations
    if (!formData.name.trim()) {
      setError('Le nom est requis')
      setLoading(false)
      return
    }
    
    if (!file) {
      setError('Veuillez sélectionner un fichier Excel')
      setLoading(false)
      return
    }

    try {
      // Créer FormData pour envoyer le fichier
      const data = new FormData()
      data.append('name', formData.name.trim())
      data.append('description', formData.description.trim())
      data.append('country', formData.country)
      data.append('file', file)

      const response = await fetch('/api/interests-check', {
        method: 'POST',
        body: data
      })

      if (response.ok) {
        const result = await response.json()
        router.push(`/interests-check/${result.slug}`)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erreur lors de la création')
      }
    } catch (error) {
      console.error('Erreur lors de la création:', error)
      setError('Erreur lors de la création du Interest Check')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/interests-check" className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Retour aux Interest Checks
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FileCheck className="h-8 w-8 text-blue-600" />
          Créer un Interest Check
        </h1>
        <p className="text-gray-600 mt-2">
          Uploadez un fichier Excel contenant vos intérêts pour analyser les suggestions Facebook
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration de l'Interest Check</CardTitle>
          <CardDescription>
            Remplissez les informations et uploadez votre fichier Excel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nom du Interest Check *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: Analyse des influenceurs belges"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Description de votre analyse..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Pays</Label>
              <select
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BE">Belgique</option>
                <option value="FR">France</option>
                <option value="DE">Allemagne</option>
                <option value="NL">Pays-Bas</option>
                <option value="US">États-Unis</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Fichier Excel *</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  id="file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  {file ? (
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">Cliquez pour changer</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-gray-900">Cliquez pour sélectionner un fichier Excel</p>
                      <p className="text-xs text-gray-500">Formats acceptés: .xlsx, .xls</p>
                    </div>
                  )}
                </label>
              </div>
              <p className="text-xs text-gray-500">
                Le fichier doit contenir une colonne avec les noms des intérêts à analyser.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Création en cours...' : 'Créer l\'Interest Check'}
              </Button>
              <Link href="/interests-check">
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 