export default function Home() {
  return (
    <div className="w-full px-32 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>
      <div className="space-y-4">
        <p className="text-muted-foreground">Bienvenue sur votre tableau de bord.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Contenu du dashboard à venir */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Projets récents</h3>
            <p className="text-gray-500">À venir...</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Catégories</h3>
            <p className="text-gray-500">À venir...</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Analytics</h3>
            <p className="text-gray-500">À venir...</p>
          </div>
        </div>
      </div>
    </div>
  )
} 