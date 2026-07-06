import { useMemo } from 'react'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

function FieldSet({ className, ...props }) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        'has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3 flex flex-col gap-4',
        className
      )}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  variant = 'legend',
  ...props
}) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        'data-[variant=label]:text-sm data-[variant=legend]:text-base mb-1.5 font-medium',
        className
      )}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        'group/field-group @container/field-group data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4 flex w-full flex-col gap-5',
        className
      )}
      {...props}
    />
  )
}

const fieldVariants = cva(
  'group/field flex w-full gap-2 data-[invalid=true]:text-destructive',
  {
    variants: {
      orientation: {
        vertical: 'flex-col *:w-full [&>.sr-only]:w-auto',
        horizontal:
          'flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
        responsive:
          'flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
      },
    },
    defaultVariants: {
      orientation: 'vertical',
    },
  }
)

function Field({
  className,
  orientation = 'vertical',
  ...props
}) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(
        fieldVariants({ orientation }),
        className
      )}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }) {
  return (
    <div
      data-slot="field-content"
      className={cn(
        'group/field-content flex flex-1 flex-col gap-0.5 leading-snug',
        className
      )}
      {...props}
    />
  )
}

function FieldLabel({ className, ...props }) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        'group/field-label peer/field-label group-data-[disabled=true]/field:opacity-50 has-data-checked:border-primary/30 has-data-checked:bg-primary/5 has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border *:data-[slot=field]:p-2.5 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10 flex w-fit gap-2 leading-snug',
        'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col',
        className
      )}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        'group-data-[disabled=true]/field:opacity-50 flex w-fit items-center gap-2 text-sm font-medium',
        className
      )}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        'text-muted-foreground group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5 text-left text-sm font-normal leading-normal',
        'nth-last-2:-mt-1 last:mt-0',
        '[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        className
      )}
      {...props}
    />
  )
}

function FieldSeparator({ children, className, ...props }) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        'group-data-[variant=outline]/field-group:-mb-2 relative -my-2 h-5 text-sm',
        className
      )}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children && (
        <span
          className="bg-background text-muted-foreground relative mx-auto block w-fit px-2"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  )
}

function FieldError({
  className,
  children,
  errors,
  ...props
}) {
  const content = useMemo(() => {
    if (children) {
      return children
    }

    if (!errors?.length) {
      return null
    }

    const uniqueErrors = [
      ...new Map(
        errors.map((error) => [error?.message, error])
      ).values(),
    ]

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map(
          (error, index) =>
            error?.message && (
              <li key={index}>{error.message}</li>
            )
        )}
      </ul>
    )
  }, [children, errors])

  if (!content) {
    return null
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn(
        'text-destructive text-sm font-normal',
        className
      )}
      {...props}
    >
      {content}
    </div>
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
}
