'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/providers/theme-provider'
import { ToastProvider } from '@/providers/toast-provider'
import { ZustandProvider } from '@/providers/zustand-provider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ZustandProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ZustandProvider>
      </ThemeProvider>
    </SessionProvider>
  )
} 