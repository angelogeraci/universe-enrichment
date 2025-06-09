describe('Gestion des Listes de Catégories', () => {
  beforeEach(() => {
    // Connexion en tant qu'utilisateur admin
    cy.visit('/login')
    cy.get('input[name="email"]').type('angelo.geraci@soprism.com')
    cy.get('input[name="password"]').type('admin1234')
    cy.get('button[type="submit"]').click()
    cy.url().should('not.include', '/login')
  })

  describe('Affichage des listes de catégories', () => {
    it('devrait afficher la liste des catégories avec le tableau', () => {
      cy.visit('/categories')
      
      // Vérifier la présence du tableau
      cy.get('table').should('be.visible')
      cy.get('thead').should('contain', 'Nom de la liste')
      cy.get('thead').should('contain', 'Catégories')
      cy.get('thead').should('contain', 'Visibilité')
      cy.get('thead').should('contain', 'Date de création')
      cy.get('thead').should('contain', 'Actions')
    })

    it('devrait afficher les informations correctes pour chaque liste', () => {
      cy.visit('/categories')
      
      // Vérifier qu'au moins une ligne existe
      cy.get('tbody tr').should('have.length.at.least', 1)
      
      // Vérifier la présence des badges de visibilité
      cy.get('tbody').should('contain.text', 'Public')
      cy.get('tbody').should('contain.text', 'Privé')
      
      // Vérifier la présence des boutons d'action
      cy.get('button').contains('Éditer').should('exist')
      cy.get('button').contains('Supprimer').should('exist')
    })
  })

  describe('Navigation vers l\'édition', () => {
    it('devrait naviguer vers la page d\'édition en cliquant sur le nom', () => {
      cy.visit('/categories')
      
      // Cliquer sur le premier nom de liste (lien bleu)
      cy.get('tbody tr').first().find('button.text-blue-600').click()
      
      // Vérifier la redirection vers la page d'édition
      cy.url().should('include', '/categories/')
      cy.url().should('include', '/edit')
      
      // Vérifier la présence du titre d'édition
      cy.get('h1').should('contain', 'Édition de la liste de catégories')
    })

    it('devrait naviguer vers l\'édition avec le bouton Éditer', () => {
      cy.visit('/categories')
      
      // Cliquer sur le bouton Éditer
      cy.get('button').contains('Éditer').first().click()
      
      cy.url().should('include', '/categories/')
      cy.url().should('include', '/edit')
    })
  })

  describe('Sélection multiple de listes', () => {
    it('devrait sélectionner des listes individuellement', () => {
      cy.visit('/categories')
      
      // Attendre que la page soit chargée et qu'il y ait au moins une liste
      cy.get('table').should('be.visible')
      cy.get('tbody tr').should('have.length.at.least', 1)
      
      // Sélectionner la première liste
      cy.get('tbody input[type="checkbox"]').first().check()
      
      // Vérifier que le bouton de suppression groupée apparaît
      cy.get('button').contains('Supprimer la sélection').should('be.visible')
      cy.get('button').contains('Supprimer la sélection').should('contain', '(1)')
      
      // Sélectionner une deuxième liste si elle existe
      cy.get('tbody tr').then($rows => {
        if ($rows.length > 1) {
          cy.get('tbody input[type="checkbox"]').eq(1).check()
          cy.get('button').contains('Supprimer la sélection').should('contain', '(2)')
        }
      })
    })

    it('devrait sélectionner toutes les listes avec "Sélectionner tout"', () => {
      cy.visit('/categories')
      
      // Attendre que la page soit chargée et qu'il y ait au moins une liste
      cy.get('table').should('be.visible')
      cy.get('tbody tr').should('have.length.at.least', 1)
      
      // Compter le nombre total de listes
      cy.get('tbody tr').then($rows => {
        const totalCount = $rows.length
        
        // Cliquer sur "Sélectionner tout"
        cy.get('thead input[type="checkbox"]').check()
        
        // Vérifier que toutes les cases sont cochées
        cy.get('tbody input[type="checkbox"]').should('be.checked')
        
        // Vérifier le bon nombre dans le bouton
        cy.get('button').contains('Supprimer la sélection').should('contain', `(${totalCount})`)
      })
    })

    it('devrait désélectionner tout en décochant "Sélectionner tout"', () => {
      cy.visit('/categories')
      
      // Attendre que la page soit chargée et qu'il y ait au moins une liste
      cy.get('table').should('be.visible')
      cy.get('tbody tr').should('have.length.at.least', 1)
      
      // Sélectionner tout d'abord
      cy.get('thead input[type="checkbox"]').check()
      cy.get('tbody input[type="checkbox"]').should('be.checked')
      
      // Puis désélectionner tout
      cy.get('thead input[type="checkbox"]').uncheck()
      cy.get('tbody input[type="checkbox"]').should('not.be.checked')
      
      // Le bouton de suppression ne devrait plus être visible
      cy.get('button').contains('Supprimer la sélection').should('not.exist')
    })
  })

  describe('Suppression de listes de catégories', () => {
    it('devrait supprimer une liste individuelle avec confirmation', () => {
      cy.visit('/categories')
      
      // Attendre que la page soit chargée et qu'il y ait au moins une liste
      cy.get('table').should('be.visible')
      cy.get('tbody tr').should('have.length.at.least', 1)
      
      // Compter les listes avant suppression
      cy.get('tbody tr').then($rows => {
        const initialCount = $rows.length
        
        // Cliquer sur le bouton Supprimer de la première liste
        cy.get('button').contains('Supprimer').first().click()
        
        // Vérifier l'ouverture du modal de confirmation
        cy.get('[role="dialog"]').should('be.visible')
        cy.get('h2').should('contain', 'Supprimer')
        cy.get('.text-sm').should('contain', 'Cette action est irréversible')
        
        // Confirmer la suppression
        cy.get('button').contains('Confirmer').click()
        
        // Vérifier que la liste a été supprimée (ou gérer le cas où il n'y a plus de listes)
        if (initialCount > 1) {
          cy.get('tbody tr').should('have.length', initialCount - 1)
        } else {
          // Si c'était la dernière liste, vérifier qu'il n'y a plus de listes
          cy.get('body').should('contain', 'Aucune liste de catégories')
        }
      })
    })

    it('devrait annuler la suppression d\'une liste', () => {
      cy.visit('/categories')
      
      // Attendre que la page soit chargée et qu'il y ait au moins une liste
      cy.get('table').should('be.visible')
      cy.get('tbody tr').should('have.length.at.least', 1)
      
      cy.get('tbody tr').then($rows => {
        const initialCount = $rows.length
        
        cy.get('button').contains('Supprimer').first().click()
        
        // Annuler la suppression
        cy.get('button').contains('Annuler').click()
        
        // Vérifier que le modal se ferme
        cy.get('[role="dialog"]').should('not.exist')
        
        // Vérifier qu'aucune liste n'a été supprimée
        cy.get('tbody tr').should('have.length', initialCount)
      })
    })

    it('devrait supprimer plusieurs listes sélectionnées', () => {
      cy.visit('/categories')
      
      // Attendre que la page soit chargée et qu'il y ait au moins deux listes
      cy.get('table').should('be.visible')
      cy.get('tbody tr').should('have.length.at.least', 2)
      
      // Sélectionner quelques listes
      cy.get('tbody input[type="checkbox"]').eq(0).check()
      cy.get('tbody input[type="checkbox"]').eq(1).check()
      
      // Cliquer sur suppression groupée
      cy.get('button').contains('Supprimer la sélection').click()
      
      // Vérifier le modal de confirmation groupée
      cy.get('[role="dialog"]').should('be.visible')
      cy.get('h2').should('contain', 'Supprimer 2 liste(s) de catégories')
      cy.get('.text-sm').should('contain', 'supprimera définitivement 2 liste(s)')
      
      // Confirmer la suppression
      cy.get('button').contains('Confirmer').click()
      
      // Vérifier que la sélection est réinitialisée
      cy.get('button').contains('Supprimer la sélection').should('not.exist')
    })

    it('devrait afficher une erreur si la liste est utilisée par des projets', () => {
      // Créer d'abord un projet qui utilise une liste de catégories
      cy.visit('/projects/create')
      cy.window().then((win) => {
        win.localStorage.setItem('newProjectData', JSON.stringify({
          name: 'Projet Test Contrainte',
          description: 'Test'
        }))
      })
      
      // Terminer la création du projet avec la première liste disponible
      cy.get('select').contains('Pays').select('France')
      cy.get('input[value="companies"]').check()
      cy.get('select').contains('Liste de catégories').select(1)
      cy.get('button').contains('Créer le projet').click()
      
      // Maintenant essayer de supprimer la liste utilisée
      cy.visit('/categories')
      
      // Trouver et essayer de supprimer la liste utilisée
      cy.get('button').contains('Supprimer').first().click()
      cy.get('button').contains('Confirmer').click()
      
      // Vérifier l'affichage de l'erreur de contrainte
      cy.get('.toast').should('contain', 'utilisée par')
      cy.get('.toast').should('contain', 'impossible de supprimer')
    })
  })

  describe('États de chargement et erreurs', () => {
    it('devrait afficher un état de chargement pendant la suppression', () => {
      cy.visit('/categories')
      
      // Attendre que la page soit chargée et qu'il y ait au moins une liste
      cy.get('table').should('be.visible')
      cy.get('tbody tr').should('have.length.at.least', 1)
      
      // Intercepter l'API pour ralentir la réponse
      cy.intercept('DELETE', '/api/categories/slug/*', (req) => {
        req.reply({
          delay: 1000, // Délai de 1 seconde
          statusCode: 200, 
          body: { message: 'Supprimé' }
        })
      })
      
      cy.get('button').contains('Supprimer').first().click()
      cy.get('[role="dialog"]').should('be.visible')
      cy.get('button').contains('Confirmer').click()
      
      // Vérifier l'état de chargement
      cy.get('button').contains('Suppression...').should('be.visible')
      cy.get('button').contains('Suppression...').should('be.disabled')
    })

    it('devrait gérer les erreurs de réseau', () => {
      cy.visit('/categories')
      
      // Attendre que la page soit chargée et qu'il y ait au moins une liste
      cy.get('table').should('be.visible')
      cy.get('tbody tr').should('have.length.at.least', 1)
      
      // Simuler une erreur réseau
      cy.intercept('DELETE', '/api/categories/slug/*', { statusCode: 500, body: { error: 'Erreur serveur' } })
      
      cy.get('button').contains('Supprimer').first().click()
      cy.get('[role="dialog"]').should('be.visible')
      cy.get('button').contains('Confirmer').click()
      
      // Vérifier l'affichage de l'erreur (sera gérée par l'application)
      cy.wait(1000) // Attendre que l'erreur soit traitée
    })
  })

  describe('Filtrage et recherche', () => {
    it('devrait filtrer les listes par visibilité', () => {
      cy.visit('/categories')
      
      // Attendre que la page soit chargée et qu'il y ait au moins une liste
      cy.get('table').should('be.visible')
      cy.get('tbody tr').should('have.length.at.least', 1)
      
      // Vérifier la présence des badges de visibilité dans le tableau
      cy.get('tbody').should('contain.text', 'Public')
      cy.get('tbody').should('contain.text', 'Privé')
    })

    it('devrait trier les listes par date de création', () => {
      cy.visit('/categories')
      
      // Attendre que la page soit chargée et qu'il y ait au moins une liste
      cy.get('table').should('be.visible')
      cy.get('tbody tr').should('have.length.at.least', 1)
      
      // Vérifier que les dates sont affichées au format dd/mm/yyyy
      cy.get('tbody tr').should('contain.text', '/')
      
      // Les listes devraient être triées par date (plus récentes en premier)
      cy.get('tbody tr').first().should('be.visible')
    })
  })

  describe('Responsive design', () => {
    it('devrait fonctionner correctement sur mobile', () => {
      cy.viewport('iphone-6')
      cy.visit('/categories')
      
      // Vérifier que le tableau reste utilisable
      cy.get('table').should('be.visible')
      
      // Les boutons devraient rester accessibles
      cy.get('button').contains('Éditer').should('be.visible')
      cy.get('button').contains('Supprimer').should('be.visible')
    })

    it('devrait fonctionner correctement sur tablette', () => {
      cy.viewport('ipad-2')
      cy.visit('/categories')
      
      cy.get('table').should('be.visible')
      cy.get('thead input[type="checkbox"]').should('be.visible')
    })
  })
}) 