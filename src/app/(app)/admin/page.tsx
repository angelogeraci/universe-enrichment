import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/dashboard')
  }
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Admin</h1>
      <p>Page d'administration (réservée aux admins).</p>
    </div>
  )
} 