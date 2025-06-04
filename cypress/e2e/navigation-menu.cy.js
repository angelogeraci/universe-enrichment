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

  it('affiche le lien Admin uniquement pour un admin', () => {
    cy.visit('/login')
    cy.get('input[name="email"]').type('angelo.geraci@soprism.com')
    cy.get('input[name="password"]').type('admin1234')
    cy.get('button[type="submit"]').click()
    cy.get('nav').should('exist')
    cy.get('nav').contains('Admin').should('exist')
  })

  it('n\'affiche pas le lien Admin pour un user classique', () => {
    cy.visit('/login')
    cy.get('input[name="email"]').type('user@demo.com')
    cy.get('input[name="password"]').type('user1234')
    cy.get('button[type="submit"]').click()
    cy.get('nav').should('exist')
    cy.get('nav').contains('Admin').should('not.exist')
  })
}) 