"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface DeleteConfirmModalProps {
  children: React.ReactNode
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  isLoading?: boolean
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ 
  children, 
  onConfirm, 
  title, 
  description,
  isLoading = false 
}) => {
  const [open, setOpen] = React.useState(false)

  const handleConfirm = async () => {
    try {
      await onConfirm()
      setOpen(false)
    } catch (error) {
      // Ne pas fermer le modal en cas d'erreur
      console.error('Erreur lors de la confirmation:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-red-600">Confirmer la suppression</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p className="font-medium">{title}</p>
            <p className="mt-2">{description}</p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteConfirmModal 