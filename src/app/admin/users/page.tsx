import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/projects')
  }
  return (
    <div className="w-full px-32 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
      </div>
      <div className="text-muted-foreground">
        Gérez les utilisateurs de l'application.
      </div>
    </div>
  )
} 