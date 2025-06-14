"use client"

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Home, Folder, Database, BarChart, User, Shield, LogOut, LogIn, Book, Settings, MessageSquare, FileSearch2 } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import React from 'react'

interface UserWithRole {
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string
}

export function AppSidebar() {
  console.log('AppSidebar mounted')
  const { data: session } = useSession()
  const isAuthenticated = !!session?.user
  const user = session?.user as UserWithRole | undefined
  const isAdmin = isAuthenticated && user?.role === 'admin'

  const handleSignOut = () => signOut({ callbackUrl: '/login' })

  return (
    <Sidebar className="fixed top-0 left-0 h-screen z-30 border-r bg-sidebar text-sidebar-foreground">
      <SidebarContent className="flex flex-col h-full px-6 py-6">
        {/* Header avec logo et nom */}
        <div className="flex items-center gap-3 px-2 pt-0 pb-2">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-primary border border-gray-200">A</div>
          <span className="text-2xl font-extrabold tracking-tight text-gray-900">Acme Inc.</span>
        </div>
        {/* Bouton Quick Create */}
        <button className="flex items-center gap-2 w-full px-3 py-2 mb-2 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors text-base">
          <span className="text-lg">+</span> Quick Create
          <span className="ml-auto"><svg width="20" height="20" fill="none"><rect width="20" height="20" rx="6" fill="#fff"/><path d="M7 10h6M10 7v6" stroke="#000" strokeWidth="1.5" strokeLinecap="round"/></svg></span>
        </button>
        {/* Groupe principal */}
        <nav aria-label="Main menu" data-cy="main-nav">
          <SidebarMenu className="mt-2 bg-muted">
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={false} className="text-gray-900 font-medium text-base hover:bg-gray-300 hover:text-black focus:bg-gray-400 focus:text-black">
                <Link href="/" data-cy="sidebar-dashboard">
                  <Home className="mr-3 h-5 w-5" /> Dashboard
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={false} className="text-gray-900 font-medium text-base hover:bg-gray-300 hover:text-black focus:bg-gray-400 focus:text-black">
                <Link href="/projects" data-cy="sidebar-projects">
                  <Folder className="mr-3 h-5 w-5" /> Projects
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={false} className="text-gray-900 font-medium text-base hover:bg-gray-300 hover:text-black focus:bg-gray-400 focus:text-black">
                <Link href="/categories" data-cy="sidebar-categories">
                  <Database className="mr-3 h-5 w-5" /> Categories
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={false} className="text-gray-900 font-medium text-base hover:bg-gray-300 hover:text-black focus:bg-gray-400 focus:text-black">
                <Link href="/scoring" data-cy="sidebar-scoring">
                  <BarChart className="mr-3 h-5 w-5" /> Analytics
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {isAuthenticated && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={false} className="text-gray-900 font-medium text-base hover:bg-gray-300 hover:text-black focus:bg-gray-400 focus:text-black">
                  <Link href="/profile" data-cy="sidebar-profile">
                    <User className="mr-3 h-5 w-5" /> Team
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </nav>

        {/* Section Admin - Visible uniquement pour les admins */}
        {isAdmin && (
          <>
            <div className="mt-6 mb-1 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</div>
            <SidebarMenu className="bg-muted">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={false} className="text-gray-700 text-base hover:bg-gray-200 hover:text-black focus:bg-gray-300 focus:text-black">
                  <Link href="/admin/prompts" data-cy="sidebar-admin-prompts">
                    <MessageSquare className="mr-3 h-5 w-5" /> Prompts
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={false} className="text-gray-700 text-base hover:bg-gray-200 hover:text-black focus:bg-gray-300 focus:text-black">
                  <Link href="/admin/logs" data-cy="sidebar-admin-logs">
                    <FileSearch2 className="mr-3 h-5 w-5" /> Logs
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={false} className="text-gray-700 text-base hover:bg-gray-200 hover:text-black focus:bg-gray-300 focus:text-black">
                  <Link href="/admin/settings" data-cy="sidebar-admin-settings">
                    <Settings className="mr-3 h-5 w-5" /> Settings
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={false} className="text-gray-700 text-base hover:bg-gray-200 hover:text-black focus:bg-gray-300 focus:text-black">
                  <Link href="/admin/users" data-cy="sidebar-admin-users">
                    <User className="mr-3 h-5 w-5" /> Utilisateurs
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </>
        )}

        {/* Section Documents - Visible pour tous (si besoin) */}
        {!isAdmin && (
          <>
            <div className="mt-6 mb-1 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Documents</div>
            <SidebarMenu className="bg-muted">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={false} className="text-gray-700 text-base hover:bg-gray-200 hover:text-black focus:bg-gray-300 focus:text-black">
                  <Link href="#" data-cy="sidebar-data-library">
                    <Database className="mr-3 h-5 w-5" /> Data Library
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={false} className="text-gray-700 text-base hover:bg-gray-200 hover:text-black focus:bg-gray-300 focus:text-black">
                  <Link href="#" data-cy="sidebar-reports">
                    <Book className="mr-3 h-5 w-5" /> Reports
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={false} className="text-gray-700 text-base hover:bg-gray-200 hover:text-black focus:bg-gray-300 focus:text-black">
                  <Link href="#" data-cy="sidebar-word-assistant">
                    <LogIn className="mr-3 h-5 w-5" /> Word Assistant
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={false} className="text-gray-700 text-base hover:bg-gray-200 hover:text-black focus:bg-gray-300 focus:text-black">
                  <Link href="#" data-cy="sidebar-more">
                    <span className="mr-3 h-5 w-5">...</span> More
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </>
        )}

        {/* Déconnexion en bas */}
        <div className="flex-1" />
        <div className="mt-2 px-3">
          {isAuthenticated ? (
            <button onClick={handleSignOut} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-300 hover:text-black focus:bg-gray-400 focus:text-black transition-colors text-base" data-cy="sidebar-logout">
              <LogOut className="mr-2 h-5 w-5" /> Déconnexion
            </button>
          ) : (
            <SidebarMenuButton asChild isActive={false} className="w-full text-gray-700 text-base">
              <Link href="/login" data-cy="sidebar-login">
                <LogIn className="mr-2 h-5 w-5" /> Connexion
              </Link>
            </SidebarMenuButton>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  )
} 