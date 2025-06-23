describe('Sécurité des pages protégées (redirection login)', () => {
  const protectedRoutes = [
    '/app/projects',
    '/app/categories',
  ]

  protectedRoutes.forEach(route => {
    it(`redirige vers /login si non authentifié pour ${route}`, () => {
      cy.visit(route, { failOnStatusCode: false })
      cy.url().should('include', '/login')
    })
  })

  it('redirige vers /login ou /app/projects si non authentifié pour /app/admin', () => {
    cy.visit('/app/admin', { failOnStatusCode: false })
    cy.url().should('not.include', '/app/admin')
    cy.url().should('satisfy', (url) => url.includes('/login') || url.includes('/app/projects'))
  })

  it('redirige vers /app/projects si utilisateur authentifié non-admin tente /app/admin', () => {
    cy.visit('/login')
    cy.get('input[name="email"]').type('user@demo.com')
    cy.get('input[name="password"]').type('user1234')
    cy.get('button[type="submit"]').click()
    cy.url().should('not.include', '/login')
    cy.visit('/app/admin', { failOnStatusCode: false })
    cy.url().should('not.include', '/app/admin')
    cy.url().should('include', '/app/projects')
  })
}) 