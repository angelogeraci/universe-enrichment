import { toast } from 'sonner'
import { useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastOptions {
  duration?: number
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
}

export const useToast = () => {
  const showToast = useCallback((message: string, type: ToastType = 'info', options?: ToastOptions) => {
    const config = {
      duration: options?.duration || 4000,
      ...options
    }

    switch (type) {
      case 'success':
        return toast.success(message, config)
      case 'error':
        return toast.error(message, config)
      case 'warning':
        return toast.warning(message, config)
      case 'info':
      default:
        return toast.info(message, config)
    }
  }, [])

  const success = useCallback((message: string, options?: ToastOptions) => showToast(message, 'success', options), [showToast])
  const error = useCallback((message: string, options?: ToastOptions) => showToast(message, 'error', options), [showToast])
  const warning = useCallback((message: string, options?: ToastOptions) => showToast(message, 'warning', options), [showToast])
  const info = useCallback((message: string, options?: ToastOptions) => showToast(message, 'info', options), [showToast])

  return {
    success,
    error,
    warning,
    info,
    toast: showToast
  }
}

// Fonction utilitaire pour gérer les erreurs API de manière globale
export const handleApiError = (error: any, customMessage?: string) => {
  const { error: showError } = useToast()
  
  let message = customMessage || 'Une erreur inattendue s\'est produite'
  
  if (error?.message) {
    message = error.message
  } else if (typeof error === 'string') {
    message = error
  } else if (error?.response?.data?.error) {
    message = error.response.data.error
  }
  
  showError(message, { duration: 6000 })
} 