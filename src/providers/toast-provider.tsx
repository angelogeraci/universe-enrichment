'use client'

import * as React from 'react'
import { Toaster } from 'sonner'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster 
        richColors 
        position="bottom-center"
        toastOptions={{
          style: {
            fontSize: '14px',
            padding: '12px 16px',
            borderRadius: '8px',
            minHeight: '48px',
          },
          duration: 4000,
          className: 'toast-custom',
        }}
        theme="light"
        expand={true}
        visibleToasts={5}
        closeButton={true}
      />
    </>
  )
} 