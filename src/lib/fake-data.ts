// Fake data for demo purposes



export const fakeProjects = [
  { id: 'p1', name: 'Campagne A', status: 'Actif', createdAt: '2024-05-01' },
  { id: 'p2', name: 'Campagne B', status: 'Terminé', createdAt: '2024-04-15' },
  { id: 'p3', name: 'Campagne C', status: 'En attente', createdAt: '2024-06-01' },
]

export const fakeProjectDetail = {
  id: 'p1',
  name: 'Campagne A',
  status: 'Actif',
  description: 'Campagne de test pour enrichissement.',
  createdAt: '2024-05-01',
  enrichments: [
    { id: 'e1', name: 'Enrichissement 1', status: 'Succès', date: '2024-05-10' },
    { id: 'e2', name: 'Enrichissement 2', status: 'Erreur', date: '2024-05-20' },
  ],
}

export const fakeEnrichments = [
  { id: 'e1', name: 'Enrichissement 1', status: 'Succès', date: '2024-05-10' },
  { id: 'e2', name: 'Enrichissement 2', status: 'Erreur', date: '2024-05-20' },
]

export const fakeScoringModels = [
  { id: 's1', name: 'Modèle A', accuracy: 0.92 },
  { id: 's2', name: 'Modèle B', accuracy: 0.87 },
]

export const fakeUsers = [
  { id: 'u1', email: 'admin@demo.com', role: 'admin', createdAt: '2024-01-01' },
  { id: 'u2', email: 'user1@demo.com', role: 'user', createdAt: '2024-02-15' },
  { id: 'u3', email: 'user2@demo.com', role: 'user', createdAt: '2024-03-10' },
] 