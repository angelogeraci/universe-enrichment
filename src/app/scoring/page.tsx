import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { fakeScoringModels } from '@/lib/fake-data'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function ScoringPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <h1 className="text-2xl font-bold mb-4">Scoring</h1>
      <Button className="mb-4">Créer un modèle</Button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {fakeScoringModels.map(model => (
          <Card key={model.id} className="w-full">
            <CardHeader>
              <CardTitle>{model.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <span className="text-sm">Précision : <b>{(model.accuracy * 100).toFixed(1)}%</b></span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
} 