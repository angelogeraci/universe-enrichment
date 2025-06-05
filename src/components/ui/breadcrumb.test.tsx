import { render, screen } from '@testing-library/react'
import { Breadcrumb } from './breadcrumb'
import { usePathname } from 'next/navigation'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

describe('Breadcrumb', () => {
  it('affiche Dashboard seul sur la page racine', () => {
    (usePathname as jest.Mock).mockReturnValue('/')
    render(<Breadcrumb />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('/')).not.toBeInTheDocument()
  })

  it('affiche les segments du chemin', () => {
    (usePathname as jest.Mock).mockReturnValue('/projects/123')
    render(<Breadcrumb />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('123')).toBeInTheDocument()
  })
}) 