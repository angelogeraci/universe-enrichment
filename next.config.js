/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Désactiver ESLint lors du build pour éviter les erreurs dans les fichiers générés
    ignoreDuringBuilds: true,
  },
  experimental: {
    // turbo: false supprimé car non supporté
  }
}

module.exports = nextConfig 