describe('Sécurité des pages protégées (redirection login)', () => {
  const protectedRoutes = [
    '/dashboard',
    '/projects',
    '/enrichment',
    '/scoring',
    '/admin',
  ]

  protectedRoutes.forEach(route => {
    it(`redirige vers /login si non authentifié pour ${route}`, () => {
      cy.visit(route, { failOnStatusCode: false })
      cy.url().should('include', '/login')
    })
  })
}) 