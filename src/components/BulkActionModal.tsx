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
      // Don't close modal on error
      console.error('Error during confirmation:', error)
    }
  }

  const isDelete = action === "delete"
  const actionText = isDelete ? "deletion" : "update"
  const actionVerb = isDelete ? "Delete" : "Update"
  const actionColor = isDelete ? "text-red-600" : "text-blue-600"
  const buttonVariant = isDelete ? "destructive" : "default"
  const loadingText = isDelete ? "Deleting..." : "Updating..."

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className={actionColor}>
            Confirm {actionText}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p className="font-medium">
              {actionVerb} {selectedCount} selected {selectedCount > 1 ? 'criteria' : 'criterion'}?
            </p>
            <p className="mt-2">
              {isDelete ? (
                <>
                  This action is <span className="font-semibold text-red-600">irreversible</span>. 
                  All selected criteria and their associated suggestions will be permanently deleted.
                </>
              ) : (
                <>
                  This action will update all selected criteria with the latest Facebook suggestions.
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
              Cancel
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