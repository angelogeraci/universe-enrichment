"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/useToast'

const schema = z.object({
  name: z.string().min(2, "Le nom du projet est requis"),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

// Type pour les projets (basé sur ce qui est dans la page)
export type Project = {
  id: string
  name: string
  slug?: string
  description: string
  country: string
  countryFlag: string
  criteriaMatchCount: number
  progressStatus: 'error' | 'in_progress' | 'ready'
  createdAt: string
  enrichmentStatus?: 'pending' | 'done'
}

interface CreateProjectModalProps {
  children?: React.ReactNode
  onProjectCreated?: () => void
  project?: Project // Projet à éditer (optionnel)
  mode?: 'create' | 'edit' // Mode d'utilisation
}

export default function CreateProjectModal({ 
  children, 
  onProjectCreated,
  project,
  mode = 'create'
}: CreateProjectModalProps) {
  const [open, setOpen] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { success, error: showError } = useToast()

  // Pré-remplir les champs lors de l'édition
  useEffect(() => {
    if (mode === 'edit' && project && open) {
      setValue('name', project.name)
      setValue('description', project.description)
    }
  }, [mode, project, open, setValue])

  const onSubmit = async (data: FormData) => {
    setError(null)
    try {
      if (mode === 'edit' && project) {
        // Mode édition - Appel API PUT
        const response = await fetch(`/api/projects/id/${project.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          const errorMessage = errorData.error || 'Erreur lors de la modification'
          setError(errorMessage)
          showError(errorMessage, { duration: 5000 })
          return
        }
        
        success('Projet modifié avec succès !', { duration: 3000 })
        setOpen(false)
        reset()
        if (onProjectCreated) onProjectCreated()
      } else {
        // Mode création - Logique existante
        localStorage.setItem('newProjectData', JSON.stringify(data))
        setOpen(false)
        reset()
        if (onProjectCreated) onProjectCreated()
        router.push('/projects/create')
      }
    } catch (e: any) {
      const errorMessage = e.message || "Erreur inconnue"
      setError(errorMessage)
      showError(errorMessage, { duration: 5000 })
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      reset()
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || <Button>{mode === 'edit' ? 'Éditer' : 'Nouveau projet'}</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Éditer le projet' : 'Créer un nouveau projet'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium mb-1">Nom du projet</label>
            <Input 
              id="project-name"
              placeholder="Ex: Campagne France 2024" 
              {...register("name")} 
            />
            {errors.name && (
              <div className="text-red-500 text-xs mt-1">{errors.name.message}</div>
            )}
          </div>
          
          <div>
            <label htmlFor="project-description" className="block text-sm font-medium mb-1">Description</label>
            <Textarea 
              id="project-description"
              placeholder="Décrivez brièvement l'objectif de ce projet... (optionnel)"
              rows={4}
              {...register("description")} 
            />
            {errors.description && (
              <div className="text-red-500 text-xs mt-1">{errors.description.message}</div>
            )}
          </div>
          
          {error && (
            <div className="text-red-500 text-xs mt-1">{error}</div>
          )}
          
          <div className="flex gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting 
                ? (mode === 'edit' ? "Modification..." : "Création...") 
                : (mode === 'edit' ? "Modifier" : "Continuer")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 