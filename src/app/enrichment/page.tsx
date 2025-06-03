import { fakeEnrichments } from '@/lib/fake-data'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function EnrichmentPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <h1 className="text-2xl font-bold mb-4">Enrichissement</h1>
      <Button className="mb-4">Lancer un enrichissement</Button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {fakeEnrichments.map(e => (
          <Card key={e.id} className="w-full">
            <CardHeader>
              <CardTitle>{e.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <span className="text-sm">Statut : <b>{e.status}</b></span>
                <span className="text-xs text-muted-foreground">Date : {e.date}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
} 