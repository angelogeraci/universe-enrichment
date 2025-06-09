export default function ProfilePage() {
  return (
    <div className="w-full px-32 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Team</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-2">Profil utilisateur</h2>
          <p className="text-muted-foreground">Contenu du profil à venir</p>
        </div>
      </div>
    </div>
  )
} 