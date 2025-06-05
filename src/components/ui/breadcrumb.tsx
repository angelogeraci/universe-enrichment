'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Breadcrumb () {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <nav className='text-sm text-gray-500 flex items-center gap-2' aria-label='Breadcrumb' data-cy='breadcrumb'>
      <Link href='/' className='hover:underline text-gray-700 font-medium'>Dashboard</Link>
      {segments.map((segment, i) => {
        const href = '/' + segments.slice(0, i + 1).join('/')
        return (
          <span key={href} className='flex items-center gap-2'>
            <span className='mx-1'>/</span>
            {i === segments.length - 1 ? (
              <span className='text-gray-900 font-semibold'>{segment.charAt(0).toUpperCase() + segment.slice(1)}</span>
            ) : (
              <Link href={href} className='hover:underline'>{segment.charAt(0).toUpperCase() + segment.slice(1)}</Link>
            )}
          </span>
        )
      })}
    </nav>
  )
} 