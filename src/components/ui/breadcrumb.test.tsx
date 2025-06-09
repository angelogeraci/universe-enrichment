import { render, screen } from '@testing-library/react'
import { Breadcrumb } from './breadcrumb'
import { usePathname } from 'next/navigation'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

describe('Breadcrumb', () => {
  it('affiche Accueil seul sur la page racine', () => {
    (usePathname as jest.Mock).mockReturnValue('/')
    render(<Breadcrumb />)
    expect(screen.getByText('Accueil')).toBeInTheDocument()
  })

  it('affiche les segments du chemin avec Accueil', () => {
    (usePathname as jest.Mock).mockReturnValue('/projects/123')
    render(<Breadcrumb />)
    expect(screen.getByText('Accueil')).toBeInTheDocument()
    expect(screen.getByText('Projets')).toBeInTheDocument()
    expect(screen.getByText('123')).toBeInTheDocument()
  })
}) 