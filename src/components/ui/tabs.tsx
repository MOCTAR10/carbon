'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

/** Accessible tabs (role=tablist, arrow keys). The list scrolls horizontally with edge fades on small screens. */
export const Tabs = TabsPrimitive.Root
export const TabsContent = TabsPrimitive.Content

export function TabsList({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <div className="relative">
      <TabsPrimitive.List
        className={cn(
          'flex gap-1 overflow-x-auto rounded-2xl border border-ivory-300 bg-ivory-200/60 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          '[mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-24px),transparent)] lg:[mask-image:none]',
          className,
        )}
        {...props}
      >
        {children}
      </TabsPrimitive.List>
    </div>
  )
}

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex min-h-[40px] flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-medium text-ink-500 transition-all [&_svg]:size-4',
      'hover:text-forest-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400',
      'data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=active]:text-forest-900 data-[state=active]:shadow-soft',
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = 'TabsTrigger'
