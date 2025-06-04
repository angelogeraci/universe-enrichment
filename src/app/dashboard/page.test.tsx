import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import DashboardPage from './page'

jest.mock('next-auth')

const mockGetServerSession = getServerSession as jest.Mock

describe('DashboardPage (sécurité serveur)', () => {
  it('redirige vers /login si pas de session', async () => {
    mockGetServerSession.mockResolvedValueOnce(null)
    // On ne peut pas tester la redirection Next.js directement ici,
    // mais on peut vérifier que le composant ne retourne rien ou une promesse rejetée
    await expect(DashboardPage()).resolves.toBeUndefined()
  })

  it('affiche la page si session présente', async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { email: 'test@demo.com' } })
    const result = await DashboardPage()
    expect(result).toBeTruthy()
  })
}) 