'use client'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'

// Typage étendu pour inclure le rôle
interface UserWithRole {
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string | null
}

interface SessionWithRole {
  user?: UserWithRole
}

export function ClientGuard({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession({ required: false }) as { data: SessionWithRole | null, status: string }
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    // Non authentifié : redirige vers /login
    if (!session?.user) {
      if (pathname !== '/login' && pathname !== '/register') {
        router.replace('/login')
      }
      return
    }
    // Si non-admin sur /admin : redirige vers /dashboard
    if (pathname.startsWith('/admin') && session.user.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [session, status, pathname, router])

  // Affiche les enfants seulement si authentifié et autorisé
  if (status === 'loading') return null
  if (!session?.user) return null
  if (pathname.startsWith('/admin') && session.user.role !== 'admin') return null
  return <>{children}</>
} 