/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Désactiver ESLint lors du build pour éviter les erreurs dans les fichiers générés
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Optimisations pour Vercel
  },
  // Packages externes pour les composants serveur
  serverExternalPackages: ['@prisma/client', 'prisma'],
  // Configuration optimisée pour Vercel
  output: 'standalone',
  // Variables d'environnement exposées au runtime
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
  // Configuration des headers pour les API
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, max-age=0, must-revalidate'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig 