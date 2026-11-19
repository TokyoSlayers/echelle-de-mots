import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'

function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-14 w-full rounded-2xl border-2 border-[#2a1845]/10 bg-white px-4 text-lg font-extrabold uppercase tracking-[0.12em] text-[#2a1845] outline-none transition placeholder:font-semibold placeholder:normal-case placeholder:tracking-normal placeholder:text-[#2a1845]/35 focus:border-[#ff8a1e] focus:shadow-[0_0_0_4px_rgba(255,138,30,0.15)]',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
