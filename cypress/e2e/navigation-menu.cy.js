describe('Affichage du menu de navigation', () => {
  it('n\'affiche pas le menu pour un utilisateur déconnecté', () => {
    cy.visit('/login')
    cy.get('[data-cy="main-nav"]').should('not.exist')
    cy.get('[data-cy="sidebar-nav"]').should('not.exist')
  })

  it('affiche le menu pour un utilisateur connecté', () => {
    cy.visit('/login')
    cy.get('input[name="email"]').type('angelo.geraci@soprism.com')
    cy.get('input[name="password"]').type('admin1234')
    cy.get('button[type="submit"]').click()
    cy.url().should('not.include', '/login')
    cy.reload()
    cy.get('[data-cy="main-nav"]', { timeout: 20000 }).should('exist')
    cy.get('[data-cy="sidebar-nav"]', { timeout: 20000 }).should('exist')
  })

  it('affiche le lien Admin uniquement pour un admin', () => {
    cy.visit('/login')
    cy.get('input[name="email"]').type('angelo.geraci@soprism.com')
    cy.get('input[name="password"]').type('admin1234')
    cy.get('button[type="submit"]').click()
    cy.url().should('not.include', '/login')
    cy.get('[data-cy="main-nav"] [data-cy="nav-admin"]', { timeout: 20000 }).should('exist')
    cy.get('[data-cy="sidebar-nav"] [data-cy="sidebar-admin"]', { timeout: 20000 }).should('exist')
  })

  it('n\'affiche pas le lien Admin pour un user classique', () => {
    cy.visit('/login')
    cy.get('input[name="email"]').type('user@demo.com')
    cy.get('input[name="password"]').type('user1234')
    cy.get('button[type="submit"]').click()
    cy.get('[data-cy="main-nav"] [data-cy="nav-admin"]').should('not.exist')
    cy.get('[data-cy="sidebar-nav"] [data-cy="sidebar-admin"]').should('not.exist')
  })

  const privateRoutes = ['/dashboard', '/projects', '/enrichment', '/scoring', '/admin']
  privateRoutes.forEach(route => {
    it(`affiche le breadcrumb sur ${route}`, () => {
      cy.visit('/login')
      cy.get('input[name="email"]').type('angelo.geraci@soprism.com')
      cy.get('input[name="password"]').type('admin1234')
      cy.get('button[type="submit"]').click()
      cy.wait(800)
      cy.visit(route)
      cy.wait(800)
      cy.log('Vérification du breadcrumb')
      cy.get('[data-cy="breadcrumb"]').should('exist')
    })
  })
}) 