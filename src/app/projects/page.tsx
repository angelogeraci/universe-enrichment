import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { fakeProjects } from '@/lib/fake-data'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <h1 className="text-2xl font-bold mb-4">Projets</h1>
      <Button asChild className="mb-4">
        <Link href="#">Créer un projet</Link>
      </Button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {fakeProjects.map(project => (
          <Card key={project.id} className="w-full">
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <span className="text-sm">Statut : <b>{project.status}</b></span>
                <span className="text-xs text-muted-foreground">Créé le {project.createdAt}</span>
                <Button asChild variant="outline" className="mt-2 w-fit">
                  <Link href={`/projects/${project.id}`}>Voir le détail</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
} 