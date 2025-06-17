"use client"
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import CategoryListEditor from './CategoryListEditor'

export default function EditCategoryListPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string
  const [name, setName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (!slug) return

    // Check if slug looks like an ID (cuid format: starts with 'c' and has many characters)
    const isLikelyId = slug.startsWith('c') && slug.length > 20

    async function handleRedirection() {
      if (isLikelyId) {
        console.log('Détection d\'un ID, tentative de redirection...')
        setRedirecting(true)
        try {
          // Try to find the list by ID and redirect to slug
          const response = await fetch(`/api/categories/${slug}`)
          if (response.ok) {
            const data = await response.json()
            console.log('Données récupérées:', data)
            if (data?.slug && data.slug !== slug) {
              console.log(`Redirection vers: /categories/${data.slug}/edit`)
              router.replace(`/categories/${data.slug}/edit`)
              return
            }
          }
        } catch (error) {
          console.error('Erreur lors de la redirection:', error)
        }
        setRedirecting(false)
      }

      // Fetch category data (either normal slug or after failed redirection)
      try {
        const response = await fetch(`/api/categories/slug/${slug}`)
        if (response.ok) {
          const data = await response.json()
          setName(data?.name || null)
        } else {
          setName(null)
        }
      } catch (error) {
        console.error('Erreur lors du chargement:', error)
        setName(null)
      } finally {
        setLoading(false)
      }
    }

    handleRedirection()
  }, [slug, router])

  if (loading || redirecting) {
    return (
      <div className="w-full px-32 py-6">
        <h1 className="text-2xl font-bold mb-6">Édition de la liste de catégories</h1>
        <div className="text-muted-foreground mb-8">
          {redirecting ? 'Redirection...' : 'Chargement...'}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-32 py-6">
      <h1 className="text-2xl font-bold mb-6">Édition de la liste de catégories</h1>
      <div className="text-muted-foreground mb-8">{name ? `Liste : ${name}` : 'Liste non trouvée'}</div>
      {slug && name && <CategoryListEditor slug={slug} />}
    </div>
  )
} 