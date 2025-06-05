describe('Sécurité des pages protégées (redirection login)', () => {
  const protectedRoutes = [
    '/dashboard',
    '/projects',
    '/enrichment',
    '/scoring',
  ]

  protectedRoutes.forEach(route => {
    it(`redirige vers /login si non authentifié pour ${route}`, () => {
      cy.visit(route, { failOnStatusCode: false })
      cy.url().should('include', '/login')
    })
  })

  it('redirige vers /login ou /dashboard si non authentifié pour /admin', () => {
    cy.visit('/admin', { failOnStatusCode: false })
    cy.url().should('not.include', '/admin')
    cy.url().should('satisfy', (url) => url.includes('/login') || url.includes('/dashboard'))
  })

  it('redirige vers /dashboard si utilisateur authentifié non-admin tente /admin', () => {
    cy.visit('/login')
    cy.get('input[name="email"]').type('user@demo.com')
    cy.get('input[name="password"]').type('user1234')
    cy.get('button[type="submit"]').click()
    cy.url().should('not.include', '/login')
    cy.visit('/admin', { failOnStatusCode: false })
    cy.url().should('not.include', '/admin')
    cy.url().should('include', '/dashboard')
  })
}) 