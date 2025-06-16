"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface BulkActionModalProps {
  children: React.ReactNode
  onConfirm: () => void | Promise<void>
  action: "delete" | "update"
  selectedCount: number
  isLoading?: boolean
}

const BulkActionModal: React.FC<BulkActionModalProps> = ({ 
  children, 
  onConfirm, 
  action,
  selectedCount,
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

  const isDelete = action === "delete"
  const actionText = isDelete ? "suppression" : "mise à jour"
  const actionVerb = isDelete ? "Supprimer" : "Mettre à jour"
  const actionColor = isDelete ? "text-red-600" : "text-blue-600"
  const buttonVariant = isDelete ? "destructive" : "default"
  const loadingText = isDelete ? "Suppression..." : "Mise à jour..."

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className={actionColor}>
            Confirmer la {actionText}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p className="font-medium">
              {actionVerb} {selectedCount} critère{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''} ?
            </p>
            <p className="mt-2">
              {isDelete ? (
                <>
                  Cette action est <span className="font-semibold text-red-600">irréversible</span>. 
                  Tous les critères sélectionnés et leurs suggestions associées seront définitivement supprimés.
                </>
              ) : (
                <>
                  Cette action va mettre à jour tous les critères sélectionnés avec les suggestions Facebook les plus récentes.
                </>
              )}
            </p>
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
              variant={buttonVariant}
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? loadingText : actionVerb}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default BulkActionModal 