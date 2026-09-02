// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  render,
  screen,
} from '@testing-library/react'

import Program from '@/pages/program/[slug]'

vi.mock('next/router', () => ({
  useRouter: () => ({ locale: 'en' }),
}))

vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key, values) => {
      if (values?.name) return `${key} ${values.name}`
      if (
        typeof values?.low === 'number' &&
        typeof values?.high === 'number'
      ) {
        return `${values.low}–${values.high}`
      }
      return key
    },
  }),
}))

afterEach(cleanup)

const program = {
  slug: 'research-week',
  name: 'Research Week',
  about:
    'A week of guided research for high school students.',
  fields: ['Biology'],
  applicationDeadline: '2027-01-15T00:00:00.000Z',
  deadlineStatus: 'dated',
  startDate: '2027-06-10',
  endDate: '2027-06-17',
  gradeRangeLow: 9,
  gradeRangeHigh: 12,
  ageRangeLow: 15,
  ageRangeHigh: 18,
  location: 'Cambridge, MA',
  programType: 'Research Experience',
  durationText: 'One week',
  residential: 'Residential',
  eligibilityNotes: 'Students must live in Massachusetts.',
  cost: '$500',
  financialAid: 'Need-based aid is available.',
  stipend: '$100 stipend',
  contactEmail: 'program@example.org',
  applicationUrl: 'https://example.org/apply',
}

describe('Program', () => {
  it('shows the collected program details and support information', () => {
    render(<Program program={program} />)

    expect(
      screen.getByRole('heading', {
        name: 'opportunities.program_details',
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'opportunities.program_types.research_experience'
      )
    ).toBeInTheDocument()
    expect(screen.getByText('One week')).toBeInTheDocument()
    expect(
      screen.getByText(
        'opportunities.attendance_options.residential'
      )
    ).toBeInTheDocument()
    expect(screen.getByText('15–18')).toBeInTheDocument()
    expect(screen.getByText('$500')).toBeInTheDocument()
    expect(
      screen.getByText('Need-based aid is available.')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: 'program@example.org',
      })
    ).toHaveAttribute('href', 'mailto:program@example.org')
  })

  it('shows a start date when no end date exists', () => {
    render(
      <Program
        program={{
          ...program,
          endDate: null,
        }}
      />
    )

    expect(
      screen.getByText('opportunities.starts')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Jun 10, 2027')
    ).toBeInTheDocument()
  })

  it('translates pipeline placeholders before rendering them', () => {
    render(
      <Program
        program={{
          ...program,
          durationText: 'Not specified',
          cost: 'Free',
          financialAid: 'Program is Free',
          stipend: 'Not specified',
        }}
      />
    )

    expect(
      screen.getAllByText('opportunities.not_specified')
    ).toHaveLength(2)
    expect(
      screen.getByText('opportunities.free')
    ).toBeInTheDocument()
    expect(
      screen.getByText('opportunities.program_is_free')
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Not specified')
    ).not.toBeInTheDocument()
  })

  it('omits empty optional detail sections for sparse records', () => {
    render(
      <Program
        program={{
          ...program,
          programType: '',
          durationText: '',
          residential: '',
          eligibilityNotes: null,
          cost: '',
          financialAid: '',
          stipend: '',
          contactEmail: null,
          ageRangeLow: null,
          ageRangeHigh: null,
        }}
      />
    )

    expect(
      screen.queryByRole('heading', {
        name: 'opportunities.costs_and_support',
      })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: 'opportunities.eligibility',
      })
    ).not.toBeInTheDocument()
  })

  it('provides a prefilled report email for stale information', () => {
    render(<Program program={program} />)

    const reportLink = screen.getByRole('link', {
      name: /opportunities.report_outdated_action/i,
    })
    const href = new URL(reportLink.href)

    expect(href.protocol).toBe('mailto:')
    expect(href.pathname).toBe('opportunities@sciteens.org')
    expect(href.searchParams.get('subject')).toBe(
      'opportunities.report_email_subject Research Week'
    )
  })

  it('places the application action before the report action', () => {
    render(<Program program={program} />)

    const application = screen.getByRole('link', {
      name: 'opportunities.apply_official_site',
    })
    const report = screen.getByRole('link', {
      name: 'opportunities.report_outdated_action',
    })

    expect(
      application.compareDocumentPosition(report)
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })
})
