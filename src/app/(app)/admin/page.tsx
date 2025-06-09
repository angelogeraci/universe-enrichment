import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/dashboard')
  }
  return (
    <div className="w-full px-32 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Administration</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm flex flex-col p-6">
          <h2 className="text-lg font-semibold mb-2">Prompt principal</h2>
          <p className="mb-4 text-sm text-muted-foreground">Gérez le prompt principal utilisé pour la génération de critères marketing.</p>
          <Link href="/admin/prompts" className="inline-block px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition">Éditer le prompt</Link>
        </div>
      </div>
    </div>
  )
} 