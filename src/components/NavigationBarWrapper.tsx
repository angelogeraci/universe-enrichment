"use client"

import { NavigationBar } from './navigation-bar'
import { useSession } from 'next-auth/react'

export function NavigationBarWrapper() {
  const { data: session, status } = useSession()
  if (status === 'loading') return null
  if (!session?.user) return null
  return <NavigationBar />
} 