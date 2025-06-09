"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ReactNode, useEffect } from "react"

interface UserWithRole {
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string | null
}

interface SessionWithRole {
  user?: UserWithRole
}

export function ClientGuard({ children, role }: { children: ReactNode; role?: string }) {
  const { data: session, status } = useSession() as { data: SessionWithRole | null, status: string }
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.replace("/login")
    } else if (role && session.user?.role !== role) {
      router.replace("/")
    }
  }, [session, status, role, router])

  if (status === "loading" || !session) {
    return <div className="flex justify-center items-center h-full">Chargement...</div>
  }
  return <>{children}</>
} 