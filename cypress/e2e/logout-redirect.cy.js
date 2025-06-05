describe('Déconnexion et sécurité', () => {
  it('redirige vers /login après logout', () => {
    // Connexion
    cy.visit('/login')
    cy.get('input[name="email"]').type('angelo.geraci@soprism.com')
    cy.get('input[name="password"]').type('admin1234')
    cy.get('button[type="submit"]').click()
    cy.wait(800)
    cy.url().should('not.include', '/login')
    cy.reload()
    cy.get('[data-cy="nav-logout"], [data-cy="sidebar-logout"]', { timeout: 20000 }).first().should('be.visible').click({ force: true })
    cy.wait(1000)
    cy.reload()
    cy.wait(1000)
    cy.url().should('satisfy', (url) => url.includes('/login') || url.includes('/dashboard'))
    // Tente d'accéder à une page protégée
    cy.visit('/dashboard', { failOnStatusCode: false })
    cy.url().should('include', '/login')
  })
}) 