import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateProjectModal from './CreateProjectModal'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn()
  })
}))

// Mock fetch
global.fetch = jest.fn()

describe('CreateProjectModal', () => {
  const mockOnProjectCreated = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
    // Clear localStorage
    localStorage.clear()
  })

  describe('Mode création', () => {
    it('renders modal trigger button', () => {
      render(
        <CreateProjectModal onProjectCreated={mockOnProjectCreated} />
      )

      expect(screen.getByText('Nouveau projet')).toBeInTheDocument()
    })

    it('opens modal when trigger is clicked', async () => {
      render(
        <CreateProjectModal onProjectCreated={mockOnProjectCreated} />
      )

      fireEvent.click(screen.getByText('Nouveau projet'))

      await waitFor(() => {
        expect(screen.getByText('Créer un nouveau projet')).toBeInTheDocument()
        expect(screen.getByLabelText(/nom du projet/i)).toBeInTheDocument()
      })
    })

    it('submits form and stores data in localStorage', async () => {
      const user = userEvent.setup()
      
      render(
        <CreateProjectModal onProjectCreated={mockOnProjectCreated} />
      )

      // Ouvrir le modal
      fireEvent.click(screen.getByText('Nouveau projet'))

      await waitFor(() => {
        expect(screen.getByText('Créer un nouveau projet')).toBeInTheDocument()
      })

      // Remplir le formulaire
      await user.type(screen.getByLabelText(/nom du projet/i), 'Mon Projet Test')
      await user.type(screen.getByLabelText(/description/i), 'Description du projet')
      
      // Soumettre
      fireEvent.click(screen.getByRole('button', { name: /continuer/i }))

      await waitFor(() => {
        // Vérifier que les données sont dans localStorage
        const stored = localStorage.getItem('newProjectData')
        expect(stored).toContain('Mon Projet Test')
        expect(mockOnProjectCreated).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Mode édition', () => {
    const mockProject = {
      id: '123',
      name: 'Projet existant',
      description: 'Description existante',
      country: 'FR',
      countryFlag: '🇫🇷',
      criteriaMatchCount: 5,
      progressStatus: 'ready' as const,
      createdAt: '2024-01-01'
    }

    it('renders in edit mode with correct title', async () => {
      render(
        <CreateProjectModal 
          onProjectCreated={mockOnProjectCreated}
          project={mockProject}
          mode="edit"
        />
      )

      // Cliquer sur le bouton trigger
      fireEvent.click(screen.getByText('Éditer'))

      await waitFor(() => {
        expect(screen.getByText('Éditer le projet')).toBeInTheDocument()
      })
    })

    it('pre-fills form with project data', async () => {
      render(
        <CreateProjectModal 
          onProjectCreated={mockOnProjectCreated}
          project={mockProject}
          mode="edit"
        />
      )

      // Ouvrir le modal
      fireEvent.click(screen.getByText('Éditer'))

      await waitFor(() => {
        expect(screen.getByDisplayValue('Projet existant')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Description existante')).toBeInTheDocument()
      })
    })

    it('submits PUT request on edit', async () => {
      const user = userEvent.setup()
      
      // Mock successful API response
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockProject, name: 'Projet modifié' })
      })

      render(
        <CreateProjectModal 
          onProjectCreated={mockOnProjectCreated}
          project={mockProject}
          mode="edit"
        />
      )

      // Ouvrir le modal
      fireEvent.click(screen.getByText('Éditer'))

      await waitFor(() => {
        expect(screen.getByDisplayValue('Projet existant')).toBeInTheDocument()
      })

      // Modifier le nom
      const nameInput = screen.getByDisplayValue('Projet existant')
      await user.clear(nameInput)
      await user.type(nameInput, 'Projet modifié')
      
      // Soumettre
      fireEvent.click(screen.getByRole('button', { name: /modifier/i }))

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/projects/123', expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Projet modifié')
        }))
      })
    })
  })

  describe('Validation', () => {
    it('shows error when name is empty', async () => {
      render(
        <CreateProjectModal onProjectCreated={mockOnProjectCreated} />
      )

      // Ouvrir le modal
      fireEvent.click(screen.getByText('Nouveau projet'))

      await waitFor(() => {
        expect(screen.getByText('Créer un nouveau projet')).toBeInTheDocument()
      })

      // Essayer de soumettre sans nom
      fireEvent.click(screen.getByRole('button', { name: /continuer/i }))

      await waitFor(() => {
        expect(screen.getByText(/nom du projet est requis/i)).toBeInTheDocument()
      })
    })
  })

  describe('Interaction', () => {
    it('closes modal when cancel button is clicked', async () => {
      render(
        <CreateProjectModal onProjectCreated={mockOnProjectCreated} />
      )

      // Ouvrir le modal
      fireEvent.click(screen.getByText('Nouveau projet'))

      await waitFor(() => {
        expect(screen.getByText('Créer un nouveau projet')).toBeInTheDocument()
      })

      // Fermer le modal
      fireEvent.click(screen.getByRole('button', { name: /annuler/i }))

      await waitFor(() => {
        expect(screen.queryByText('Créer un nouveau projet')).not.toBeInTheDocument()
      })
    })
  })
}) 