import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-bold transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default: 'bg-[#2a1845] text-white hover:bg-[#3d2463]',
        challenge:
          'bg-[linear-gradient(100deg,#ff5a36,#ff8a1e_48%,#ff4d8d)] text-white shadow-[0_12px_28px_rgba(255,90,54,0.35)] hover:brightness-105',
        outline: 'border border-[#2a1845]/10 bg-white text-[#2a1845] hover:bg-[#fff1e6]',
        ghost: 'bg-transparent text-[#2a1845] hover:bg-black/5',
        soft: 'bg-[#fff1e6] text-[#2a1845] hover:bg-[#ffe4d2]',
        danger: 'border border-[#fecdd3] bg-white text-[#9f1239] hover:bg-[#fff1f2]',
      },
      size: {
        default: 'h-11 px-4 text-sm',
        sm: 'h-9 px-3 text-sm',
        lg: 'h-14 px-6 text-base',
        icon: 'size-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }

function Button({ className, variant, size, asChild = false, type = 'button', ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size }), className)} type={asChild ? undefined : type} {...props} />
}

export { Button }
