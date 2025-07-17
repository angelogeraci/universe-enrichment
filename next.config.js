/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Désactiver ESLint lors du build pour éviter les erreurs dans les fichiers générés
    ignoreDuringBuilds: true,
  },
  experimental: {
    // turbo: false supprimé car non supporté
  },
  webpack: (config, { isServer }) => {
    // Fix pour les chunks vendor manquants
    if (isServer) {
      config.externals = config.externals || []
      // Éviter les problèmes de chunks vendor côté serveur
      config.externals.push('next-auth', '@next-auth/prisma-adapter')
    }
    
    // Optimisation des chunks
    config.optimization = config.optimization || {}
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    }
    
    return config
  },
  // Configuration pour éviter les erreurs de chunks
  compress: true,
  poweredByHeader: false,
}

module.exports = nextConfig 