"use client"

import { AppSidebar } from './app-sidebar'
import { useSession } from 'next-auth/react'

export function SidebarWrapper() {
  const { data: session } = useSession()
  
  if (!session) return null
  
  return <AppSidebar />
} 