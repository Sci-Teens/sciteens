import * as React from 'react'

import { cn } from '@/lib/utils'

function Label({ className, ...props }) {
  return (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control -- htmlFor is supplied by consumers (FieldLabel/forms)
    <label
      data-slot="label"
      className={cn(
        'group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 flex select-none items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export { Label }
