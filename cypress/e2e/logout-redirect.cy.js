describe('Déconnexion et sécurité', () => {
  it('redirige vers /login après logout', () => {
    // Connexion
    cy.visit('/login')
    cy.get('input[name="email"]').type('angelo.geraci@soprism.com')
    cy.get('input[name="password"]').type('admin1234')
    cy.get('button[type="submit"]').click()
    cy.url().should('not.include', '/login')
    // Déconnexion (suppose un bouton ou lien "Déconnexion" ou "Logout")
    cy.contains(/déconnexion|logout/i).click({ force: true })
    cy.url().should('include', '/login')
    // Tente d'accéder à une page protégée
    cy.visit('/dashboard', { failOnStatusCode: false })
    cy.url().should('include', '/login')
  })
}) 