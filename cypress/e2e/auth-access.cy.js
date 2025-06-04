describe('Accès aux pages protégées pour un utilisateur authentifié', () => {
  it('permet d\'accéder au dashboard après connexion', () => {
    cy.visit('/login')
    cy.get('input[name="email"]').type('angelo.geraci@soprism.com')
    cy.get('input[name="password"]').type('admin1234')
    cy.get('button[type="submit"]').click()
    cy.url().should('not.include', '/login')
    cy.visit('/dashboard')
    cy.url().should('include', '/dashboard')
    cy.get('h1').should('contain.text', 'Dashboard')
    cy.contains(/dashboard/i, { timeout: 5000 })
  })
}) 