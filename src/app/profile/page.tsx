import { fakeUsers } from '@/lib/fake-data'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ProfilePage() {
  const user = fakeUsers[0]
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <h1 className="text-2xl font-bold mb-4">Profil utilisateur</h1>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{user.email}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <span className="text-sm">Rôle : <b>{user.role}</b></span>
            <span className="text-xs text-muted-foreground">Créé le {user.createdAt}</span>
            <Button variant="outline" className="mt-2 w-fit">Modifier le profil</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
} 