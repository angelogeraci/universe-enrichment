describe('Édition des Catégories Individuelles', () => {
  describe('Affichage de l\'éditeur de catégories', () => {
    beforeEach(() => {
      // Connexion en tant qu'utilisateur admin
      cy.visit('/login')
      cy.get('input[name="email"]').type('angelo.geraci@soprism.com')
      cy.get('input[name="password"]').type('admin1234')
      cy.get('button[type="submit"]').click()
      cy.url().should('not.include', '/login')
      
      // Visiter une liste de catégories existante pour les tests
      cy.visit('/categories/new/edit')
      
      // Attendre que la page soit complètement chargée
      cy.get('h1', { timeout: 10000 }).should('contain', 'Édition de la liste de catégories')
    })

    it('devrait afficher la page d\'édition avec le formulaire d\'ajout', () => {
      cy.get('h1').should('contain', 'Édition de la liste de catégories')
      
      // Vérifier la présence du formulaire d'ajout
      cy.get('label').contains('Nom de la catégorie').should('be.visible')
      cy.get('label').contains('Paths').should('be.visible')
      cy.get('label').contains('Critères AND').should('be.visible')
      
      // Vérifier la présence du tableau des catégories
      cy.get('h2').contains('Catégories de la liste').should('be.visible')
      cy.get('table').should('be.visible')
    })

    it('devrait afficher le tableau des catégories avec les bonnes colonnes', () => {
      cy.get('table thead').should('contain', 'Nom')
      cy.get('table thead').should('contain', 'Path')
      cy.get('table thead').should('contain', 'Critères AND')
      cy.get('table thead').should('contain', 'Actions')
      
      // Vérifier la case à cocher "Sélectionner tout"
      cy.get('thead input[type="checkbox"]').should('be.visible')
    })
  })

  describe('Ajout de nouvelles catégories', () => {
    it('devrait ajouter une nouvelle catégorie simple', () => {
      // Remplir le formulaire
      cy.get('input[placeholder="Nom"]').type('Nouvelle Catégorie Test')
      cy.get('input[placeholder="Path #1"]').type('/test/category')
      
      // Soumettre le formulaire
      cy.get('button').contains('Ajouter la catégorie').click()
      
      // Attendre le rechargement et vérifier que la catégorie apparaît
      cy.wait(1000) // Attendre le rechargement des données
      
      // Vérifier que le formulaire est réinitialisé
      cy.get('input[placeholder="Nom"]').should('have.value', '')
    })

    it('devrait ajouter une catégorie avec plusieurs paths', () => {
      cy.get('input[placeholder="Nom"]').type('Catégorie Multi-Path')
      cy.get('input[placeholder="Path #1"]').type('/path1')
      
      // Ajouter un deuxième path
      cy.get('button').contains('Ajouter un path').click()
      cy.get('input[placeholder="Path #2"]').type('/path2')
      
      // Ajouter un troisième path
      cy.get('button').contains('Ajouter un path').click()
      cy.get('input[placeholder="Path #3"]').type('/path3')
      
      cy.get('button').contains('Ajouter la catégorie').click()
      
      // Attendre le rechargement
      cy.wait(1000)
    })

    it('devrait ajouter une catégorie avec critères AND', () => {
      cy.get('input[placeholder="Nom"]').type('Catégorie avec Critères')
      cy.get('input[placeholder="Path #1"]').type('/test')
      
      // Ajouter des critères AND
      cy.get('button').contains('Ajouter un critère').click()
      cy.get('input[placeholder="Critère #1"]').type('critère1')
      
      cy.get('button').contains('Ajouter un critère').click()
      cy.get('input[placeholder="Critère #2"]').type('critère2')
      
      cy.get('button').contains('Ajouter la catégorie').click()
      
      // Attendre le rechargement
      cy.wait(1000)
    })

    it('devrait valider les champs requis', () => {
      // Essayer de soumettre sans nom - le bouton devrait être désactivé
      cy.get('button').contains('Ajouter la catégorie').should('be.disabled')
      
      // Ajouter un nom mais vider le path
      cy.get('input[placeholder="Nom"]').type('Test')
      cy.get('input[placeholder="Path #1"]').clear()
      cy.get('button').contains('Ajouter la catégorie').should('be.disabled')
    })
  })

  describe('Sélection multiple de catégories', () => {
    it('devrait sélectionner des catégories individuellement', () => {
      // S'assurer qu'il y a des catégories dans le tableau
      cy.get('table tbody tr').should('have.length.at.least', 1)
      
      // Sélectionner la première catégorie
      cy.get('tbody input[type="checkbox"]').first().check()
      
      // Vérifier que le bouton de suppression groupée apparaît
      cy.get('button').contains('Supprimer la sélection').should('be.visible')
      cy.get('button').contains('Supprimer la sélection').should('contain', '(1)')
      
      // Sélectionner une deuxième catégorie si elle existe
      cy.get('tbody input[type="checkbox"]').then($checkboxes => {
        if ($checkboxes.length > 1) {
          cy.get('tbody input[type="checkbox"]').eq(1).check()
          cy.get('button').contains('Supprimer la sélection').should('contain', '(2)')
        }
      })
    })

    it('devrait sélectionner toutes les catégories avec "Sélectionner tout"', () => {
      cy.get('table tbody tr').then($rows => {
        if ($rows.length > 0) {
          const totalCount = $rows.length
          
          // Cliquer sur "Sélectionner tout"
          cy.get('thead input[type="checkbox"]').check()
          
          // Vérifier que toutes les cases sont cochées
          cy.get('tbody input[type="checkbox"]').should('be.checked')
          
          // Vérifier le bon nombre dans le bouton
          cy.get('button').contains('Supprimer la sélection').should('contain', `(${totalCount})`)
        }
      })
    })

    it('devrait désélectionner tout', () => {
      cy.get('table tbody tr').then($rows => {
        if ($rows.length > 0) {
          // Sélectionner tout d'abord
          cy.get('thead input[type="checkbox"]').check()
          cy.get('tbody input[type="checkbox"]').should('be.checked')
          
          // Puis désélectionner tout
          cy.get('thead input[type="checkbox"]').uncheck()
          cy.get('tbody input[type="checkbox"]').should('not.be.checked')
          
          // Le bouton de suppression ne devrait plus être visible
          cy.get('button').contains('Supprimer la sélection').should('not.exist')
        }
      })
    })
  })

  describe('Suppression de catégories', () => {
    beforeEach(() => {
      // Ajouter une catégorie de test pour la supprimer
      cy.get('input[placeholder="Nom"]').type('Catégorie à Supprimer')
      cy.get('input[placeholder="Path #1"]').type('/test/delete')
      cy.get('button').contains('Ajouter la catégorie').click()
      cy.get('table tbody').should('contain', 'Catégorie à Supprimer')
    })

    it('devrait supprimer une catégorie individuelle avec confirmation', () => {
      // Compter les catégories avant suppression
      cy.get('table tbody tr').then($rows => {
        const initialCount = $rows.length
        
        // Trouver et cliquer sur le bouton de suppression de notre catégorie test
        cy.get('table tbody tr').contains('Catégorie à Supprimer').parent().within(() => {
          cy.get('button').contains('Supprimer').click()
        })
        
        // Vérifier l'ouverture du modal de confirmation
        cy.get('[role="dialog"]').should('be.visible')
        cy.get('h2').should('contain', 'Supprimer la catégorie')
        cy.get('.text-sm').should('contain', 'Cette action est irréversible')
        
        // Confirmer la suppression
        cy.get('button').contains('Confirmer').click()
        
        // Vérifier que la catégorie a été supprimée
        cy.get('table tbody tr').should('have.length', initialCount - 1)
        cy.get('table tbody').should('not.contain', 'Catégorie à Supprimer')
      })
    })

    it('devrait annuler la suppression d\'une catégorie', () => {
      cy.get('table tbody tr').then($rows => {
        const initialCount = $rows.length
        
        cy.get('table tbody tr').contains('Catégorie à Supprimer').parent().within(() => {
          cy.get('button').contains('Supprimer').click()
        })
        
        // Annuler la suppression
        cy.get('button').contains('Annuler').click()
        
        // Vérifier que le modal se ferme
        cy.get('[role="dialog"]').should('not.exist')
        
        // Vérifier qu'aucune catégorie n'a été supprimée
        cy.get('table tbody tr').should('have.length', initialCount)
        cy.get('table tbody').should('contain', 'Catégorie à Supprimer')
      })
    })

    it('devrait supprimer plusieurs catégories sélectionnées', () => {
      // Ajouter une deuxième catégorie pour le test
      cy.get('input[placeholder="Nom"]').type('Deuxième Catégorie à Supprimer')
      cy.get('input[placeholder="Path #1"]').type('/test/delete2')
      cy.get('button').contains('Ajouter la catégorie').click()
      
      // Sélectionner les deux catégories de test
      cy.get('table tbody tr').contains('Catégorie à Supprimer').parent().within(() => {
        cy.get('input[type="checkbox"]').check()
      })
      
      cy.get('table tbody tr').contains('Deuxième Catégorie à Supprimer').parent().within(() => {
        cy.get('input[type="checkbox"]').check()
      })
      
      // Cliquer sur suppression groupée
      cy.get('button').contains('Supprimer la sélection').click()
      
      // Vérifier le modal de confirmation groupée
      cy.get('[role="dialog"]').should('be.visible')
      cy.get('h2').should('contain', 'Supprimer 2 catégorie(s)')
      cy.get('.text-sm').should('contain', 'supprimera définitivement 2 catégorie(s)')
      
      // Confirmer la suppression
      cy.get('button').contains('Confirmer').click()
      
      // Vérifier que les catégories ont été supprimées
      cy.get('table tbody').should('not.contain', 'Catégorie à Supprimer')
      cy.get('table tbody').should('not.contain', 'Deuxième Catégorie à Supprimer')
      
      // Vérifier que la sélection est réinitialisée
      cy.get('button').contains('Supprimer la sélection').should('not.exist')
    })
  })

  describe('États de chargement et erreurs', () => {
    it('devrait afficher un état de chargement pendant l\'ajout', () => {
      // Intercepter l'API pour ralentir la réponse
      cy.intercept('POST', '/api/categories/slug/*', {
        delay: 1000,
        statusCode: 200, 
        body: { success: true }
      })
      
      cy.get('input[placeholder="Nom"]').type('Test Loading')
      cy.get('input[placeholder="Path #1"]').type('/test')
      cy.get('button').contains('Ajouter la catégorie').click()
      
      // Vérifier l'état de chargement
      cy.get('button').contains('Ajout...').should('be.visible')
      cy.get('button').contains('Ajout...').should('be.disabled')
    })

    it('devrait afficher un état de chargement pendant la suppression', () => {
      // Ajouter une catégorie de test
      cy.get('input[placeholder="Nom"]').type('Test Loading Delete')
      cy.get('input[placeholder="Path #1"]').type('/test')
      cy.get('button').contains('Ajouter la catégorie').click()
      
      // Intercepter l'API de suppression
      cy.intercept('DELETE', '/api/categories/slug/*', {
        delay: 1000,
        statusCode: 200, 
        body: { message: 'Supprimé' }
      })
      
      cy.get('table tbody tr').contains('Test Loading Delete').parent().within(() => {
        cy.get('button').contains('Supprimer').click()
      })
      
      cy.get('button').contains('Confirmer').click()
      
      // Vérifier l'état de chargement
      cy.get('button').contains('Suppression...').should('be.visible')
      cy.get('button').contains('Suppression...').should('be.disabled')
    })

    it('devrait gérer les erreurs lors de l\'ajout', () => {
      // Simuler une erreur
      cy.intercept('POST', '/api/categories/slug/*', { statusCode: 500, body: { error: 'Erreur serveur' } })
      
      cy.get('input[placeholder="Nom"]').type('Test Error')
      cy.get('input[placeholder="Path #1"]').type('/test')
      cy.get('button').contains('Ajouter la catégorie').click()
      
      // Vérifier l'affichage de l'erreur
      cy.get('.text-red-500').should('contain', 'Erreur')
    })

    it('devrait gérer les erreurs lors de la suppression', () => {
      // Ajouter une catégorie de test
      cy.get('input[placeholder="Nom"]').type('Test Error Delete')
      cy.get('input[placeholder="Path #1"]').type('/test')
      cy.get('button').contains('Ajouter la catégorie').click()
      
      // Simuler une erreur de suppression
      cy.intercept('DELETE', '/api/categories/slug/*', { statusCode: 500, body: { error: 'Impossible de supprimer' } })
      
      cy.get('table tbody tr').contains('Test Error Delete').parent().within(() => {
        cy.get('button').contains('Supprimer').click()
      })
      
      cy.get('button').contains('Confirmer').click()
      
      // Vérifier l'affichage de l'erreur
      cy.get('.text-red-500').should('contain', 'Erreur')
    })
  })

  describe('Interface utilisateur', () => {
    it('devrait pouvoir retirer des paths dynamiquement', () => {
      // Ajouter plusieurs paths
      cy.get('button').contains('Ajouter un path').click()
      cy.get('button').contains('Ajouter un path').click()
      
      // Vérifier que nous avons 3 champs path
      cy.get('input[placeholder^="Path #"]').should('have.length', 3)
      
      // Retirer le deuxième path
      cy.get('input[placeholder="Path #2"]').parent().within(() => {
        cy.get('button').contains('-').click()
      })
      
      // Vérifier qu'il ne reste que 2 champs
      cy.get('input[placeholder^="Path #"]').should('have.length', 2)
    })

    it('devrait pouvoir retirer des critères AND dynamiquement', () => {
      // Ajouter plusieurs critères
      cy.get('button').contains('Ajouter un critère').click()
      cy.get('button').contains('Ajouter un critère').click()
      
      // Vérifier que nous avons 2 champs critères
      cy.get('input[placeholder^="Critère #"]').should('have.length', 2)
      
      // Retirer le premier critère
      cy.get('input[placeholder="Critère #1"]').parent().within(() => {
        cy.get('button').contains('-').click()
      })
      
      // Vérifier qu'il ne reste qu'1 champ
      cy.get('input[placeholder^="Critère #"]').should('have.length', 1)
    })

    it('devrait maintenir l\'état du formulaire lors des interactions', () => {
      // Remplir partiellement le formulaire
      cy.get('input[placeholder="Nom"]').type('Test Persistence')
      cy.get('input[placeholder="Path #1"]').type('/test')
      
      // Ajouter un critère
      cy.get('button').contains('Ajouter un critère').click()
      cy.get('input[placeholder="Critère #1"]').type('test-critère')
      
      // Interagir avec le tableau (sélectionner une catégorie)
      cy.get('tbody input[type="checkbox"]').first().check({ force: true })
      
      // Vérifier que les données du formulaire sont conservées
      cy.get('input[placeholder="Nom"]').should('have.value', 'Test Persistence')
      cy.get('input[placeholder="Path #1"]').should('have.value', '/test')
      cy.get('input[placeholder="Critère #1"]').should('have.value', 'test-critère')
    })
  })
}) 