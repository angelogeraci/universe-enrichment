"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type Critere = {
  id: string
  label: string
  category: string
  categoryPath: string[]
  country: string
  status: string
  note?: string
  suggestions: Array<{
    id: string
    label: string
    audience: number
    similarityScore: number
    isBestMatch: boolean
    isSelectedByUser: boolean
  }>
}

interface EditCriteriaModalProps {
  children?: React.ReactNode
  critere: Critere
  categoriesData?: Array<{ name: string, path: string[], andCriteria?: string[] }>
  onCriteriaUpdated?: () => void
}

export default function EditCriteriaModal({ 
  children, 
  critere,
  onCriteriaUpdated 
}: EditCriteriaModalProps) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState(critere.label)

  console.log('EditCriteriaModal render:', { critere: critere.label, open })

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/criteres/${critere.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          category: critere.category,
          categoryPath: critere.categoryPath,
          note: critere.note
        })
      })
      
      if (response.ok) {
        alert('Critère mis à jour avec succès!')
        setOpen(false)
        if (onCriteriaUpdated) onCriteriaUpdated()
      } else {
        alert('Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erreur lors de la mise à jour')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div onClick={() => console.log('Edit button clicked for:', critere.label)}>
          {children || <Button variant="outline" size="sm">Edit</Button>}
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" style={{ backgroundColor: 'red', border: '5px solid blue', zIndex: 9999 }}>
        <DialogHeader>
          <DialogTitle>Edit Criterion: {critere.label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Criterion Name
            </label>
            <Input 
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Turkish Football Fans" 
            />
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              className="flex-1"
            >
              Update
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 