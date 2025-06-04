describe('Accès à la page admin selon le rôle', () => {
  it('refuse l\'accès à /admin pour un utilisateur non admin', () => {
    cy.visit('/login')
    cy.get('input[name="email"]').type('user@demo.com')
    cy.get('input[name="password"]').type('user1234')
    cy.get('button[type="submit"]').click()
    cy.url().should('not.include', '/login')
    cy.visit('/admin', { failOnStatusCode: false })
    cy.url().should('not.include', '/admin')
    cy.url().should('include', '/login')
  })

  it('autorise l\'accès à /admin pour un admin', () => {
    cy.visit('/login')
    cy.get('input[name="email"]').type('angelo.geraci@soprism.com')
    cy.get('input[name="password"]').type('admin1234')
    cy.get('button[type="submit"]').click()
    cy.url().should('not.include', '/login')
    cy.visit('/admin')
    cy.url().should('include', '/admin')
    cy.get('h1').should('contain.text', 'Administration')
  })
}) 