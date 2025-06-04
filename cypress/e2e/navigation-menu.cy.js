describe('Affichage du menu de navigation', () => {
  it('n\'affiche pas le menu pour un utilisateur déconnecté', () => {
    cy.visit('/login')
    cy.get('nav').should('not.exist')
  })

  it('affiche le menu pour un utilisateur connecté', () => {
    cy.visit('/login')
    cy.get('input[name="email"]').type('angelo.geraci@soprism.com')
    cy.get('input[name="password"]').type('admin1234')
    cy.get('button[type="submit"]').click()
    cy.get('nav').should('exist')
  })
}) 