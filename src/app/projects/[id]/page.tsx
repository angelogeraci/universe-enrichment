import { fakeProjectDetail } from '@/lib/fake-data'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ProjectDetailPage() {
  const project = fakeProjectDetail
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <h1 className="text-2xl font-bold mb-4">Détail du projet</h1>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{project.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <span className="text-sm">Statut : <b>{project.status}</b></span>
            <span className="text-xs text-muted-foreground">Créé le {project.createdAt}</span>
            <span className="text-sm">Description : {project.description}</span>
            <Button variant="outline" className="mt-2 w-fit">Éditer le projet</Button>
          </div>
        </CardContent>
      </Card>
      <div className="w-full max-w-md">
        <h2 className="text-lg font-semibold mb-2">Enrichissements liés</h2>
        {project.enrichments.map(e => (
          <Card key={e.id} className="mb-2">
            <CardContent className="flex flex-col gap-1">
              <span className="font-medium">{e.name}</span>
              <span className="text-xs">Statut : {e.status}</span>
              <span className="text-xs text-muted-foreground">Date : {e.date}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
} 