import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'

function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />
}

function DialogTrigger(props: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger {...props} />
}

function DialogClose(props: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close {...props} />
}

function DialogContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[#2a1845]/45 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 w-[min(34rem,calc(100%-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-[#fffaf5] p-6 shadow-2xl',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 rounded-full p-2 text-[#2a1845]/60 hover:bg-black/5" aria-label="Fermer">
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function DialogTitle(props: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className="font-display text-2xl font-semibold text-[#2a1845]" {...props} />
}

function DialogDescription(props: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-[#2a1845]/75" {...props} />
}

export { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose }
