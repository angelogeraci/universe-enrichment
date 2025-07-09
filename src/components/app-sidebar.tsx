"use client"

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Folder, Database, User, LogOut, LogIn, Settings, MessageSquare, FileSearch2, Plus, FileCheck, BarChart3, Facebook } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import CreateProjectModal from '@/components/CreateProjectModal'
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
        {/* Bouton New Project */}
        <CreateProjectModal onProjectCreated={() => window.location.reload()}>
          <button className="flex items-center gap-2 w-full px-3 py-2 mb-2 rounded-lg bg-black text-white font-medium hover:bg-gray-800 hover:cursor-pointer transition-colors text-base">
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </CreateProjectModal>
        {/* Groupe principal */}
        <nav aria-label="Main menu" data-cy="main-nav">
          <SidebarMenu className="mt-2">
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
                <Link href="/interests-check" data-cy="sidebar-interests-check">
                  <FileCheck className="mr-3 h-5 w-5" /> Interests Check
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </nav>

        {/* Section Admin - Visible uniquement pour les admins */}
        {isAdmin && (
          <>
            <div className="mt-6 mb-1 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={false} className="text-gray-900 font-medium text-base hover:bg-gray-300 hover:text-black focus:bg-gray-400 focus:text-black">
                  <Link href="/admin/prompts" data-cy="sidebar-admin-prompts">
                    <MessageSquare className="mr-3 h-5 w-5" /> Prompts
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={false} className="text-gray-900 font-medium text-base hover:bg-gray-300 hover:text-black focus:bg-gray-400 focus:text-black">
                  <Link href="/admin/performance" data-cy="sidebar-admin-performance">
                    <BarChart3 className="mr-3 h-5 w-5" /> Performance
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={false} className="text-gray-900 font-medium text-base hover:bg-gray-300 hover:text-black focus:bg-gray-400 focus:text-black">
                  <Link href="/admin/settings" data-cy="sidebar-admin-settings">
                    <Settings className="mr-3 h-5 w-5" /> Settings
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={false} className="text-gray-900 font-medium text-base hover:bg-gray-300 hover:text-black focus:bg-gray-400 focus:text-black">
                  <Link href="/admin/users" data-cy="sidebar-admin-users">
                    <User className="mr-3 h-5 w-5" /> Users
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            {/* Section Logs - Séparée pour les admins */}
            <div className="mt-6 mb-1 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Logs</div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={false} className="text-gray-900 font-medium text-base hover:bg-gray-300 hover:text-black focus:bg-gray-400 focus:text-black">
                  <Link href="/admin/logs" data-cy="sidebar-admin-logs">
                    <FileSearch2 className="mr-3 h-5 w-5" /> Application Logs
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={false} className="text-gray-900 font-medium text-base hover:bg-gray-300 hover:text-black focus:bg-gray-400 focus:text-black">
                  <Link href="/admin/facebook-logs" data-cy="sidebar-admin-facebook-logs">
                    <Facebook className="mr-3 h-5 w-5" /> Facebook Logs
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
            <button onClick={handleSignOut} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-gray-100 text-gray-900 font-medium hover:bg-gray-300 hover:text-black focus:bg-gray-400 focus:text-black transition-colors text-base" data-cy="sidebar-logout">
              <LogOut className="mr-2 h-5 w-5" /> Logout
            </button>
          ) : (
            <SidebarMenuButton asChild isActive={false} className="w-full text-gray-900 font-medium text-base">
              <Link href="/login" data-cy="sidebar-login">
                <LogIn className="mr-2 h-5 w-5" /> Login
              </Link>
            </SidebarMenuButton>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  )
} 