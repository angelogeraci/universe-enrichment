import { fakeUsers } from '@/lib/fake-data'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AdminPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <h1 className="text-2xl font-bold mb-4">Administration</h1>
      <Button className="mb-4">Ajouter un utilisateur</Button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {fakeUsers.map(user => (
          <Card key={user.id} className="w-full">
            <CardHeader>
              <CardTitle>{user.email}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <span className="text-sm">Rôle : <b>{user.role}</b></span>
                <span className="text-xs text-muted-foreground">Créé le {user.createdAt}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
} 