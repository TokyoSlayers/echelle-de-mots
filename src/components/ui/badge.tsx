import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import type { Difficulty } from '../../lib/types'

const tones: Record<Difficulty | 'neutral', string> = {
  facile: 'bg-emerald-100 text-emerald-800',
  moyen: 'bg-amber-100 text-amber-950',
  difficile: 'bg-rose-100 text-rose-800',
  neutral: 'bg-white/20 text-white',
}

function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Difficulty | 'neutral'
  className?: string
  children: ReactNode
}) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold', tones[tone], className)}>
      {children}
    </span>
  )
}

export { Badge }
