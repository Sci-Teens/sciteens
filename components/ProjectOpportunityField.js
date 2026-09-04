import { useEffect, useMemo, useRef } from 'react'
import { Combobox } from '@base-ui/react/combobox'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, X } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { useTranslation } from 'next-i18next'

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'

async function loadOpportunityOptions() {
  const response = await fetch('/api/opportunity-options')
  if (!response.ok) {
    throw new Error('Opportunity options are unavailable.')
  }
  return response.json()
}

export default function ProjectOpportunityField({
  control,
  defaultOpportunityId,
  setValue,
}) {
  const { t } = useTranslation('common')
  const appliedDefault = useRef(false)
  const { data, status } = useQuery({
    queryKey: ['opportunity-options'],
    queryFn: loadOpportunityOptions,
    staleTime: 60 * 60 * 1000,
  })
  const opportunities = useMemo(
    () =>
      Array.isArray(data?.opportunities)
        ? data.opportunities
        : [],
    [data?.opportunities]
  )

  useEffect(() => {
    if (
      appliedDefault.current ||
      status !== 'success' ||
      !defaultOpportunityId ||
      !setValue
    ) {
      return
    }

    if (
      opportunities.some(
        ({ id }) => id === defaultOpportunityId
      )
    ) {
      appliedDefault.current = true
      setValue('opportunity_id', defaultOpportunityId)
    }
  }, [
    defaultOpportunityId,
    opportunities,
    setValue,
    status,
  ])

  return (
    <Controller
      name="opportunity_id"
      control={control}
      render={({ field }) => {
        const selectedOpportunity =
          opportunities.find(
            ({ id }) => id === field.value
          ) ||
          (field.value
            ? {
                id: field.value,
                name: t(
                  'project_create_edit.unavailable_opportunity'
                ),
              }
            : null)
        const unavailableSelection =
          status === 'success' &&
          Boolean(field.value) &&
          !opportunities.some(
            ({ id }) => id === field.value
          )

        return (
          <Field data-invalid={unavailableSelection}>
            <FieldLabel htmlFor="opportunity-id">
              {t('project_create_edit.opportunity')}
            </FieldLabel>
            {status === 'pending' ? (
              <Skeleton className="h-8 w-full rounded-lg" />
            ) : status === 'error' ? (
              <FieldError>
                {t(
                  'project_create_edit.opportunities_unavailable'
                )}
              </FieldError>
            ) : (
              <Combobox.Root
                items={opportunities}
                value={selectedOpportunity}
                onValueChange={(opportunity) =>
                  field.onChange(opportunity?.id || '')
                }
                itemToStringLabel={(opportunity) =>
                  opportunity?.name || ''
                }
                isItemEqualToValue={(item, value) =>
                  item?.id === value?.id
                }
              >
                <Combobox.InputGroup className="border-input focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-3 relative flex h-8 w-full rounded-lg border bg-transparent transition-colors">
                  <Combobox.Input
                    id="opportunity-id"
                    aria-invalid={unavailableSelection}
                    placeholder={t(
                      'project_create_edit.search_opportunities'
                    )}
                    className="placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent px-2.5 text-base outline-none md:text-sm"
                  />
                  <div className="text-muted-foreground flex h-full shrink-0 items-center pr-1">
                    <Combobox.Clear
                      className="hover:bg-accent hover:text-accent-foreground size-6 flex items-center justify-center rounded-md"
                      aria-label={t(
                        'project_create_edit.clear_opportunity'
                      )}
                    >
                      <X
                        className="size-3.5"
                        aria-hidden="true"
                      />
                    </Combobox.Clear>
                    <Combobox.Trigger
                      className="hover:bg-accent hover:text-accent-foreground size-6 flex items-center justify-center rounded-md"
                      aria-label={t(
                        'project_create_edit.open_opportunities'
                      )}
                    >
                      <ChevronDown
                        className="size-4"
                        aria-hidden="true"
                      />
                    </Combobox.Trigger>
                  </div>
                </Combobox.InputGroup>
                <Combobox.Portal>
                  <Combobox.Positioner
                    className="isolate z-50 outline-none"
                    sideOffset={4}
                  >
                    <Combobox.Popup className="bg-popover text-popover-foreground ring-foreground/10 w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) rounded-lg shadow-md ring-1">
                      <Combobox.Empty className="text-muted-foreground px-3 py-4 text-sm">
                        {t(
                          'project_create_edit.no_matching_opportunities'
                        )}
                      </Combobox.Empty>
                      <Combobox.List className="data-empty:p-0 max-h-[min(18rem,var(--available-height))] overflow-y-auto overscroll-contain p-1 outline-none">
                        {(opportunity) => (
                          <Combobox.Item
                            key={opportunity.id}
                            value={opportunity}
                            className="data-highlighted:bg-accent data-highlighted:text-accent-foreground grid cursor-default grid-cols-[1rem_minmax(0,1fr)] items-start gap-2 rounded-md px-2 py-1.5 text-sm outline-none"
                          >
                            <Combobox.ItemIndicator className="mt-0.5">
                              <Check
                                className="size-4"
                                aria-hidden="true"
                              />
                            </Combobox.ItemIndicator>
                            <span className="min-w-0 break-words">
                              {opportunity.name}
                            </span>
                          </Combobox.Item>
                        )}
                      </Combobox.List>
                    </Combobox.Popup>
                  </Combobox.Positioner>
                </Combobox.Portal>
              </Combobox.Root>
            )}
            <FieldDescription>
              {t('project_create_edit.opportunity_hint')}
            </FieldDescription>
            {unavailableSelection && (
              <FieldError>
                {t(
                  'project_create_edit.unavailable_opportunity'
                )}
              </FieldError>
            )}
          </Field>
        )
      }}
    />
  )
}
