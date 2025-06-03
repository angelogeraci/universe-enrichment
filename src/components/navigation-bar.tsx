'use client'

import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from '@/components/ui/navigation-menu'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useCallback } from 'react'

export function NavigationBar() {
  const { data: session } = useSession()
  const isAuthenticated = !!session?.user
  const handleSignOut = useCallback(() => signOut({ callbackUrl: '/login' }), [])

  return (
    <nav className="w-full flex justify-center py-4 bg-background/80 border-b border-border sticky top-0 z-50 backdrop-blur-md">
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link href="/" className="px-4 py-2 rounded hover:bg-accent transition-colors">Dashboard</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link href="/projects" className="px-4 py-2 rounded hover:bg-accent transition-colors">Projets</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link href="/enrichment" className="px-4 py-2 rounded hover:bg-accent transition-colors">Enrichissement</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link href="/scoring" className="px-4 py-2 rounded hover:bg-accent transition-colors">Scoring</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link href="/admin" className="px-4 py-2 rounded hover:bg-accent transition-colors">Admin</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
          {isAuthenticated && (
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link href="/profile" className="px-4 py-2 rounded hover:bg-accent transition-colors">Profil</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          )}
          <NavigationMenuItem>
            {isAuthenticated ? (
              <button onClick={handleSignOut} className="px-4 py-2 rounded hover:bg-accent transition-colors">Déconnexion</button>
            ) : (
              <NavigationMenuLink asChild>
                <Link href="/login" className="px-4 py-2 rounded hover:bg-accent transition-colors">Connexion</Link>
              </NavigationMenuLink>
            )}
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <a href="https://ui.shadcn.com/docs" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded hover:bg-accent transition-colors">Documentation</a>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </nav>
  )
} 