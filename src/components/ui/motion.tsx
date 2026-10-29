'use client'

import * as React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1] as const

/** Container that staggers its <Reveal> children on mount. */
export function Stagger({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  )
}

export function Reveal({ className, ...props }: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 10 },
        show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
      }}
      {...props}
    />
  )
}
