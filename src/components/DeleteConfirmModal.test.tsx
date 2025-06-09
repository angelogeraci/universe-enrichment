import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import DeleteConfirmModal from './DeleteConfirmModal'

describe('DeleteConfirmModal', () => {
  const mockOnConfirm = jest.fn()
  const defaultProps = {
    title: "Supprimer l'élément",
    description: 'Cette action est irréversible.',
    onConfirm: mockOnConfirm,
    children: <button>Supprimer</button>
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders trigger button correctly', () => {
    render(<DeleteConfirmModal {...defaultProps} />)
    expect(screen.getByText('Supprimer')).toBeInTheDocument()
  })

  it('opens modal when trigger is clicked', async () => {
    render(<DeleteConfirmModal {...defaultProps} />)
    
    fireEvent.click(screen.getByText('Supprimer'))
    
    await waitFor(() => {
      expect(screen.getByText("Supprimer l'élément")).toBeInTheDocument()
      expect(screen.getByText('Cette action est irréversible.')).toBeInTheDocument()
    })
  })

  it('shows loading state when isLoading is true', async () => {
    render(<DeleteConfirmModal {...defaultProps} isLoading={true} />)
    
    fireEvent.click(screen.getByText('Supprimer'))
    
    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: 'Suppression...' })
      expect(confirmButton).toBeDisabled()
    })
  })

  it('calls onConfirm when confirm button is clicked', async () => {
    render(<DeleteConfirmModal {...defaultProps} />)
    
    fireEvent.click(screen.getByText('Supprimer'))
    
    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: 'Supprimer' })
      fireEvent.click(confirmButton)
    })
    
    expect(mockOnConfirm).toHaveBeenCalledTimes(1)
  })

  it('closes modal when cancel button is clicked', async () => {
    render(<DeleteConfirmModal {...defaultProps} />)
    
    fireEvent.click(screen.getByText('Supprimer'))
    
    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /annuler/i })
      fireEvent.click(cancelButton)
    })
    
    await waitFor(() => {
      expect(screen.queryByText("Supprimer l'élément")).not.toBeInTheDocument()
    })
  })

  it('closes modal when clicking outside', async () => {
    render(<DeleteConfirmModal {...defaultProps} />)
    
    fireEvent.click(screen.getByText('Supprimer'))
    
    await waitFor(() => {
      const dialog = screen.getByRole('dialog')
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' })
    })
    
    await waitFor(() => {
      expect(screen.queryByText("Supprimer l'élément")).not.toBeInTheDocument()
    })
  })

  it('disables confirm button when loading', async () => {
    const { rerender } = render(<DeleteConfirmModal {...defaultProps} />)
    
    fireEvent.click(screen.getByText('Supprimer'))
    
    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: 'Supprimer' })
      expect(confirmButton).not.toBeDisabled()
    })

    rerender(<DeleteConfirmModal {...defaultProps} isLoading={true} />)
    
    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: 'Suppression...' })
      expect(confirmButton).toBeDisabled()
    })
  })

  it('handles custom title and description', async () => {
    const customProps = {
      ...defaultProps,
      title: 'Titre personnalisé',
      description: 'Description personnalisée'
    }
    
    render(<DeleteConfirmModal {...customProps} />)
    
    fireEvent.click(screen.getByText('Supprimer'))
    
    await waitFor(() => {
      expect(screen.getByText('Titre personnalisé')).toBeInTheDocument()
      expect(screen.getByText('Description personnalisée')).toBeInTheDocument()
    })
  })
}) 