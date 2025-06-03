'use client'
import * as React from 'react'
import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const navigationMenuVariants = cva(
  'relative z-50 flex flex-row items-center gap-2',
  {
    variants: {
      variant: {
        default: '',
        underline: 'border-b border-border',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface NavigationMenuProps
  extends React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>,
    VariantProps<typeof navigationMenuVariants> {}

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  NavigationMenuProps
>(({ className, variant, ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    className={cn(navigationMenuVariants({ variant }), className)}
    {...props}
  />
))
NavigationMenu.displayName = 'NavigationMenu'

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={cn('flex flex-row items-center gap-2', className)}
    {...props}
  />
))
NavigationMenuList.displayName = 'NavigationMenuList'

const NavigationMenuItem = NavigationMenuPrimitive.Item
const NavigationMenuTrigger = NavigationMenuPrimitive.Trigger
const NavigationMenuContent = NavigationMenuPrimitive.Content
const NavigationMenuLink = NavigationMenuPrimitive.Link

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} 