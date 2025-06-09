import { render, screen } from '@testing-library/react'
import DashboardPage from './page'

describe('DashboardPage', () => {
  it('affiche le titre et le contenu', () => {
    render(<DashboardPage />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Statistiques')).toBeInTheDocument()
    expect(screen.getByText('Contenu du dashboard à venir')).toBeInTheDocument()
  })
}) 