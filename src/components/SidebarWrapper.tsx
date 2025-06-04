"use client"

import { SidebarApp } from './sidebar-app'
import { useSession } from 'next-auth/react'

export function SidebarWrapper() {
  const { data: session, status } = useSession()
  if (status === 'loading') return null
  if (!session?.user) return null
  return <SidebarApp />
} 