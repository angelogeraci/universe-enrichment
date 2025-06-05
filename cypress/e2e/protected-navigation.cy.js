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
    cy.wait(800)
  })

  protectedRoutes.forEach(route => {
    it(`accède à ${route} sans redirection`, () => {
      cy.visit(route)
      cy.url().should('include', route)
      cy.get('[data-cy="breadcrumb"]').should('exist')
    })
  })
}) 