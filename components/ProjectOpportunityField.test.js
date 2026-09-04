// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  render,
  screen,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'

import ProjectOpportunityField from './ProjectOpportunityField'

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: {
      opportunities: [
        { id: 'research-week', name: 'Research Week' },
      ],
    },
    status: 'success',
  }),
}))

afterEach(cleanup)

function FormFixture({
  defaultOpportunityId,
  initialOpportunityId = '',
}) {
  const form = useForm({
    defaultValues: { opportunity_id: initialOpportunityId },
  })

  return (
    <>
      <ProjectOpportunityField
        control={form.control}
        defaultOpportunityId={defaultOpportunityId}
        setValue={form.setValue}
      />
      <output aria-label="selected opportunity">
        {form.watch('opportunity_id')}
      </output>
    </>
  )
}

describe('ProjectOpportunityField', () => {
  it('selects and clears an opportunity association', async () => {
    const user = userEvent.setup()
    render(<FormFixture />)

    const trigger = screen.getByRole('combobox', {
      name: 'project_create_edit.opportunity',
    })
    await user.click(trigger)
    await user.click(
      screen.getByRole('option', { name: 'Research Week' })
    )
    expect(
      screen.getByRole('status', {
        name: 'selected opportunity',
      })
    ).toHaveTextContent('research-week')

    await user.click(
      screen.getByRole('button', {
        name: 'project_create_edit.clear_opportunity',
      })
    )
    expect(
      screen.getByRole('status', {
        name: 'selected opportunity',
      })
    ).toBeEmptyDOMElement()
  })

  it('applies a validated opportunity from the create link', async () => {
    render(
      <FormFixture defaultOpportunityId="research-week" />
    )

    expect(
      await screen.findByRole('status', {
        name: 'selected opportunity',
      })
    ).toHaveTextContent('research-week')
  })

  it('identifies a removed opportunity and lets the user clear it', async () => {
    const user = userEvent.setup()
    render(
      <FormFixture initialOpportunityId="removed-program" />
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'project_create_edit.unavailable_opportunity'
    )
    await user.click(
      screen.getByRole('button', {
        name: 'project_create_edit.clear_opportunity',
      })
    )
    expect(
      screen.queryByRole('alert')
    ).not.toBeInTheDocument()
  })
})
