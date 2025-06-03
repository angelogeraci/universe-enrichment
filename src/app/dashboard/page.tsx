import { fakeDashboard } from '@/lib/fake-data'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4">
        {fakeDashboard.stats.map(stat => (
          <Card key={stat.label} className="w-48 text-center">
            <CardHeader>
              <CardTitle>{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold">{stat.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="w-full max-w-md mt-8">
        <h2 className="text-lg font-semibold mb-2">Notifications</h2>
        {fakeDashboard.notifications.map(n => (
          <Alert key={n.id} className="mb-2">
            <AlertTitle>{n.message}</AlertTitle>
            <AlertDescription>{n.date}</AlertDescription>
          </Alert>
        ))}
      </div>
      <Button variant="outline">Action rapide</Button>
    </main>
  )
} 