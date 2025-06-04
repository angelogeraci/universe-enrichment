describe('Navigation entre pages protégées', () => {
  const protectedRoutes = [
    '/dashboard',
    '/projects',
    '/enrichment',
    '/scoring',
    '/admin',
  ]

  beforeEach(() => {
    cy.visit('/login')
    cy.get('input[name="email"]').type('angelo.geraci@soprism.com')
    cy.get('input[name="password"]').type('admin1234')
    cy.get('button[type="submit"]').click()
    cy.url().should('not.include', '/login')
    cy.wait(500) // Laisse le temps à la session de s'installer
  })

  protectedRoutes.forEach(route => {
    it(`accède à ${route} sans redirection`, () => {
      cy.visit(route)
      cy.url().should('include', route)
    })
  })
}) 