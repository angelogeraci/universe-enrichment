import { render, screen } from '@testing-library/react'
import DashboardPage from './page'

describe('DashboardPage', () => {
  it('affiche le titre et le texte', () => {
    render(<DashboardPage />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Bienvenue sur le dashboard !')).toBeInTheDocument()
  })
}) 