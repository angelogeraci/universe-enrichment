/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }

// Commandes personnalisées pour l'authentification
Cypress.Commands.add('loginAsAdmin', () => {
  // Simuler une session admin
  cy.visit('/login')
  
  // Attendre que la page de login soit chargée
  cy.get('body').should('contain', 'Connexion')
  
  // Si nous sommes redirigés vers la page de login, nous connecter
  cy.url().then((url) => {
    if (url.includes('/login')) {
      // Mock de la session via le localStorage pour tests
      cy.window().then((win) => {
        win.localStorage.setItem('next-auth.session-token', JSON.stringify({
          user: {
            id: 'test-admin-id',
            email: 'angelo.geraci@soprism.com',
            role: 'admin'
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }))
      })
      
      // Recharger pour appliquer la session
      cy.reload()
    }
  })
})

Cypress.Commands.add('loginAsUser', () => {
  cy.visit('/login')
  
  cy.url().then((url) => {
    if (url.includes('/login')) {
      cy.window().then((win) => {
        win.localStorage.setItem('next-auth.session-token', JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'user@test.com',
            role: 'user'
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }))
      })
      
      cy.reload()
    }
  })
})

Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('next-auth.session-token')
  })
  cy.visit('/login')
})

// Commande pour créer des données de test
Cypress.Commands.add('createTestProject', (projectData = {}) => {
  const defaultProject = {
    name: 'Projet Test E2E',
    description: 'Description du projet de test',
    country: 'France',
    searchType: 'companies',
    ...projectData
  }
  
  cy.request({
    method: 'POST',
    url: '/api/projects',
    body: defaultProject,
    headers: {
      'Content-Type': 'application/json'
    }
  }).then((response) => {
    expect(response.status).to.eq(201)
    return response.body
  })
})

Cypress.Commands.add('createTestCategoryList', (categoryData = {}) => {
  const defaultCategory = {
    name: 'Liste Test E2E',
    isPublic: false,
    ...categoryData
  }
  
  cy.request({
    method: 'POST',
    url: '/api/categories',
    body: defaultCategory,
    headers: {
      'Content-Type': 'application/json'
    }
  }).then((response) => {
    expect(response.status).to.eq(201)
    return response.body
  })
})

// Extensions TypeScript pour les commandes personnalisées
declare global {
  namespace Cypress {
    interface Chainable {
      loginAsAdmin(): Chainable<void>
      loginAsUser(): Chainable<void>
      logout(): Chainable<void>
      createTestProject(projectData?: any): Chainable<any>
      createTestCategoryList(categoryData?: any): Chainable<any>
    }
  }
}