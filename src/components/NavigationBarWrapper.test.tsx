import { render, screen } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import { NavigationBarWrapper } from './NavigationBarWrapper'

function renderWithSession(session: any) {
  return render(
    <SessionProvider session={session}>
      <NavigationBarWrapper />
    </SessionProvider>
  )
}

describe('NavigationBarWrapper', () => {
  it('n\'affiche pas le menu si l\'utilisateur est déconnecté', () => {
    renderWithSession(null)
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('affiche le menu si l\'utilisateur est connecté', () => {
    renderWithSession({ user: { email: 'test@demo.com' } })
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0)
  })
}) 