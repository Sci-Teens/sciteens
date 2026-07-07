'use client'

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'

import { cn } from '@/lib/utils'
import { CheckIcon } from 'lucide-react'

function Checkbox({ className, ...props }) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'size-4 border-input group-has-disabled/field:opacity-50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground peer relative flex shrink-0 items-center justify-center rounded-[4px] border outline-none transition-colors after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="[&>svg]:size-3.5 grid place-content-center text-current transition-none"
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
