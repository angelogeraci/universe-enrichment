describe('Accès aux pages protégées pour un utilisateur authentifié', () => {
  it('permet d\'accéder aux projets après connexion', () => {
    cy.visit('/login')
    cy.get('input[name="email"]').type('angelo.geraci@soprism.com')
    cy.get('input[name="password"]').type('admin1234')
    cy.get('button[type="submit"]').click()
    cy.url().should('not.include', '/login')
    cy.visit('/app/projects')
    cy.url().should('include', '/app/projects')
    cy.get('h1').should('contain.text', 'Projects')
    cy.contains(/projects/i, { timeout: 5000 })
  })
}) 