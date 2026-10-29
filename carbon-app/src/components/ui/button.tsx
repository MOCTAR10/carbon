import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory-100 disabled:pointer-events-none disabled:opacity-60 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-forest-900 text-ivory-50 shadow-soft hover:bg-forest-800 hover:shadow-lifted active:scale-[0.98]',
        gold:    'bg-gold-500 text-forest-950 shadow-soft hover:bg-gold-400 hover:shadow-gold active:scale-[0.98]',
        outline: 'border border-ivory-400 bg-white/70 text-ink-800 hover:border-forest-300 hover:bg-white',
        ghost:   'text-ink-600 hover:bg-forest-50 hover:text-forest-900',
        link:    'text-forest-700 underline-offset-4 hover:underline px-0',
      },
      size: {
        sm:   'h-8 rounded-lg px-3 text-xs [&_svg]:size-3.5',
        md:   'h-10 rounded-xl px-4 text-sm [&_svg]:size-4',
        lg:   'h-12 rounded-xl px-6 text-[15px] [&_svg]:size-4',
        icon: 'size-9 rounded-xl [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  },
)
Button.displayName = 'Button'
