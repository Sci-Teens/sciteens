import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { useTranslation } from 'next-i18next'
import { CalendarIcon } from 'lucide-react'
import moment from 'moment'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'

const DATE_FORMAT = 'YYYY-MM-DD'
// Most sign-ups are teens; open the calendar a decade and a half back
// instead of the current month so nobody has to click "previous" 200 times.
const DEFAULT_CALENDAR_MONTH = moment()
  .subtract(16, 'years')
  .toDate()
const EARLIEST_BIRTH_YEAR = moment()
  .subtract(100, 'years')
  .toDate()

// Shared date-of-birth field for the sign-up forms: a shadcn
// Popover + Calendar date picker wired to react-hook-form, storing the
// same YYYY-MM-DD string the previous native date input produced.
export default function BirthdayField({ control }) {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)

  return (
    <Controller
      name="birthday"
      control={control}
      render={({ field, fieldState }) => {
        const selected = field.value
          ? moment(field.value, DATE_FORMAT).toDate()
          : undefined

        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="birthday">
              {t('auth.birthday')}
            </FieldLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger
                render={
                  <Button
                    id="birthday"
                    type="button"
                    variant="outline"
                    aria-invalid={fieldState.invalid}
                    className={cn(
                      'w-full justify-start font-normal',
                      !selected && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="size-4" />
                    {selected
                      ? moment(selected).format(
                          'MMMM D, YYYY'
                        )
                      : t('auth.select_birthday')}
                  </Button>
                }
              />
              <PopoverContent
                className="w-auto p-0"
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={selected}
                  defaultMonth={
                    selected || DEFAULT_CALENDAR_MONTH
                  }
                  captionLayout="dropdown"
                  startMonth={EARLIEST_BIRTH_YEAR}
                  endMonth={new Date()}
                  disabled={{ after: new Date() }}
                  onSelect={(date) => {
                    field.onChange(
                      date
                        ? moment(date).format(DATE_FORMAT)
                        : ''
                    )
                    setOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
            {fieldState.invalid ? (
              <FieldError errors={[fieldState.error]} />
            ) : (
              <FieldDescription>
                {t('auth.birthday_info')}
              </FieldDescription>
            )}
          </Field>
        )
      }}
    />
  )
}
