"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function Breadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({})

  // Resolve category slugs to names
  useEffect(() => {
    const categorySlugs: string[] = []
    
    segments.forEach((segment, idx) => {
      if (segments[idx - 1] === 'categories' && segment !== 'edit') {
        categorySlugs.push(segment)
      }
    })
    
    if (categorySlugs.length > 0) {
      // Fetch category names for all slugs
      Promise.all(
        categorySlugs.map(async (slug) => {
          try {
            const res = await fetch(`/api/categories/slug/${slug}`)
            if (res.ok) {
              const data = await res.json()
              return { slug, name: data.name }
            }
          } catch {
            // Ignore errors
          }
          return { slug, name: slug }
        })
      ).then((results) => {
        const nameMap: Record<string, string> = {}
        results.forEach(({ slug, name }) => {
          nameMap[slug] = name
        })
        setCategoryNames(nameMap)
      })
    }
  }, [pathname])

  const getSegmentLabel = (segment: string, idx: number): string => {
    // Special cases for readable labels
    switch (segment) {
      case 'categories':
        return 'Categories'
      case 'projects':
        return 'Projets'

      case 'admin':
        return 'Administration'
      case 'profile':
        return 'Profil'
      case 'edit':
        return 'Édition'
      default:
        // Check if this is a category slug
        if (segments[idx - 1] === 'categories' && categoryNames[segment]) {
          return categoryNames[segment]
        }
        return decodeURIComponent(segment)
    }
  }

  return (
    <nav className="text-sm text-muted-foreground mb-4" aria-label="Breadcrumb" data-cy="breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link href="/projects" className="hover:underline">Projets</Link>
        </li>
        {segments.map((segment, idx) => {
          const href = "/" + segments.slice(0, idx + 1).join("/")
          const isLast = idx === segments.length - 1
          const label = getSegmentLabel(segment, idx)
          
          return (
            <li key={href} className="flex items-center">
              <span className="mx-2">/</span>
              {isLast ? (
                <span className="font-semibold text-foreground">{label}</span>
              ) : (
                <Link href={href} className="hover:underline">{label}</Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
} 