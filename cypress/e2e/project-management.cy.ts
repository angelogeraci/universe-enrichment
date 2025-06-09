describe('Gestion des Projets', () => {
  describe('Création de projets', () => {
    it('devrait créer un nouveau projet depuis la page des projets', () => {
      // Connexion en tant qu'utilisateur admin
      cy.visit('/login')
      cy.get('input[name="email"]').type('angelo.geraci@soprism.com')
      cy.get('input[name="password"]').type('admin1234')
      cy.get('button[type="submit"]').click()
      cy.url().should('not.include', '/login')
      
      cy.visit('/projects')
      
      // Cliquer sur le bouton "Nouveau projet"
      cy.get('button').contains('Nouveau projet').click()
      
      // Remplir le formulaire
      cy.get('input[placeholder*="Campagne"]').type('Projet Test E2E')
      cy.get('textarea[placeholder*="Décrivez"]').type('Description du projet de test')
      
      // Soumettre le formulaire
      cy.get('button').contains('Continuer').click()
      
      // Vérifier la redirection vers la page de création détaillée
      cy.url().should('include', '/projects/create')
      
      // Vérifier que les données sont pré-remplies
      cy.get('input[value="Projet Test E2E"]').should('exist')
    })

    it('devrait compléter la création avec les détails du projet', () => {
      // Connexion
      cy.visit('/login')
      cy.get('input[name="email"]').type('angelo.geraci@soprism.com')
      cy.get('input[name="password"]').type('admin1234')
      cy.get('button[type="submit"]').click()
      cy.url().should('not.include', '/login')
      
      // Simuler les données stockées
      cy.window().then((win) => {
        win.localStorage.setItem('newProjectData', JSON.stringify({
          name: 'Projet Test Complet',
          description: 'Description complète'
        }))
      })
      
      cy.visit('/projects/create')
      
      // Sélectionner un pays
      cy.get('select').contains('Pays').select('France')
      
      // Sélectionner le type de recherche
      cy.get('input[value="companies"]').check()
      
      // Sélectionner une liste de catégories
      cy.get('select').contains('Liste de catégories').select(1)
      
      // Créer le projet
      cy.get('button').contains('Créer le projet').click()
      
      // Vérifier la redirection et le succès
      cy.url().should('include', '/projects')
      cy.get('.toast').should('contain', 'Projet créé avec succès')
    })
  })

  describe('Édition de projets', () => {
    it('devrait éditer un projet existant', () => {
      cy.visit('/projects')
      
      // Attendre le chargement des projets
      cy.get('[data-testid="projects-table"]').should('be.visible')
      
      // Cliquer sur le bouton d'édition du premier projet
      cy.get('button').contains('Éditer').first().click()
      
      // Le modal d'édition devrait s'ouvrir
      cy.get('[role="dialog"]').should('be.visible')
      cy.get('h2').contains('Éditer le projet').should('be.visible')
      
      // Modifier le nom du projet
      cy.get('input[placeholder*="Campagne"]').clear().type('Projet Modifié E2E')
      cy.get('textarea[placeholder*="Décrivez"]').clear().type('Description modifiée')
      
      // Sauvegarder les modifications
      cy.get('button').contains('Modifier').click()
      
      // Vérifier que le modal se ferme
      cy.get('[role="dialog"]').should('not.exist')
      
      // Vérifier que le projet a été mis à jour dans la liste
      cy.get('[data-testid="projects-table"]').should('contain', 'Projet Modifié E2E')
    })

    it('devrait valider les champs requis lors de l\'édition', () => {
      cy.visit('/projects')
      
      cy.get('button').contains('Éditer').first().click()
      
      // Vider le champ nom (requis)
      cy.get('input[placeholder*="Campagne"]').clear()
      
      // Essayer de sauvegarder
      cy.get('button').contains('Modifier').click()
      
      // Vérifier l'affichage de l'erreur
      cy.get('.text-red-500').should('contain', 'nom du projet est requis')
      
      // Le modal ne devrait pas se fermer
      cy.get('[role="dialog"]').should('be.visible')
    })
  })

  describe('Suppression de projets', () => {
    it('devrait supprimer un projet individuel avec confirmation', () => {
      cy.visit('/projects')
      
      // Compter le nombre de projets avant suppression
      cy.get('[data-testid="project-row"]').then($rows => {
        const initialCount = $rows.length
        
        // Cliquer sur le bouton de suppression du premier projet
        cy.get('button').contains('Supprimer').first().click()
        
        // Le modal de confirmation devrait s'ouvrir
        cy.get('[role="dialog"]').should('be.visible')
        cy.get('h2').should('contain', 'Supprimer')
        
        // Confirmer la suppression
        cy.get('button').contains('Confirmer').click()
        
        // Vérifier que le projet a été supprimé
        cy.get('[data-testid="project-row"]').should('have.length', initialCount - 1)
      })
    })

    it('devrait annuler la suppression', () => {
      cy.visit('/projects')
      
      cy.get('[data-testid="project-row"]').then($rows => {
        const initialCount = $rows.length
        
        cy.get('button').contains('Supprimer').first().click()
        
        // Annuler la suppression
        cy.get('button').contains('Annuler').click()
        
        // Vérifier que le modal se ferme
        cy.get('[role="dialog"]').should('not.exist')
        
        // Vérifier qu'aucun projet n'a été supprimé
        cy.get('[data-testid="project-row"]').should('have.length', initialCount)
      })
    })
  })

  describe('Sélection multiple et suppression groupée', () => {
    it('devrait sélectionner plusieurs projets', () => {
      cy.visit('/projects')
      
      // Sélectionner les deux premiers projets
      cy.get('input[type="checkbox"]').eq(1).check() // Premier projet (index 0 = select all)
      cy.get('input[type="checkbox"]').eq(2).check() // Deuxième projet
      
      // Vérifier que le bouton de suppression groupée apparaît
      cy.get('button').contains('Supprimer la sélection').should('be.visible')
      cy.get('button').contains('Supprimer la sélection').should('contain', '(2)')
    })

    it('devrait sélectionner tous les projets avec la case "Sélectionner tout"', () => {
      cy.visit('/projects')
      
      // Cliquer sur "Sélectionner tout"
      cy.get('thead input[type="checkbox"]').check()
      
      // Vérifier que toutes les cases sont cochées
      cy.get('tbody input[type="checkbox"]').should('be.checked')
      
      // Vérifier que le bouton de suppression groupée affiche le bon nombre
      cy.get('[data-testid="project-row"]').then($rows => {
        cy.get('button').contains('Supprimer la sélection').should('contain', `(${$rows.length})`)
      })
    })

    it('devrait supprimer plusieurs projets sélectionnés', () => {
      cy.visit('/projects')
      
      // Sélectionner quelques projets
      cy.get('input[type="checkbox"]').eq(1).check()
      cy.get('input[type="checkbox"]').eq(2).check()
      
      // Cliquer sur suppression groupée
      cy.get('button').contains('Supprimer la sélection').click()
      
      // Confirmer dans le modal
      cy.get('[role="dialog"]').should('be.visible')
      cy.get('h2').should('contain', 'Supprimer 2 projet(s)')
      cy.get('button').contains('Confirmer').click()
      
      // Vérifier que les projets ont été supprimés
      cy.get('.toast').should('contain', 'supprimés avec succès')
      
      // Vérifier que la sélection est réinitialisée
      cy.get('button').contains('Supprimer la sélection').should('not.exist')
    })

    it('devrait désélectionner tout en décochant "Sélectionner tout"', () => {
      cy.visit('/projects')
      
      // Sélectionner tout d'abord
      cy.get('thead input[type="checkbox"]').check()
      cy.get('tbody input[type="checkbox"]').should('be.checked')
      
      // Puis désélectionner tout
      cy.get('thead input[type="checkbox"]').uncheck()
      cy.get('tbody input[type="checkbox"]').should('not.be.checked')
      
      // Le bouton de suppression groupée ne devrait plus être visible
      cy.get('button').contains('Supprimer la sélection').should('not.exist')
    })
  })

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs de réseau lors de la création', () => {
      // Intercepter l'API et simuler une erreur
      cy.intercept('POST', '/api/projects', { statusCode: 500, body: { error: 'Erreur serveur' } })
      
      cy.visit('/projects')
      cy.get('button').contains('Nouveau projet').click()
      
      cy.get('input[placeholder*="Campagne"]').type('Projet Test Erreur')
      cy.get('button').contains('Continuer').click()
      
      // Vérifier l'affichage de l'erreur
      cy.get('.text-red-500').should('contain', 'Erreur serveur')
    })

    it('devrait gérer les erreurs lors de la suppression', () => {
      // Intercepter l'API et simuler une erreur
      cy.intercept('DELETE', '/api/projects/*', { statusCode: 500, body: { error: 'Impossible de supprimer' } })
      
      cy.visit('/projects')
      
      cy.get('button').contains('Supprimer').first().click()
      cy.get('button').contains('Confirmer').click()
      
      // Vérifier l'affichage de l'erreur
      cy.get('.toast').should('contain', 'Erreur lors de la suppression')
    })
  })
}) 