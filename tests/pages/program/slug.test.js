// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  render,
  screen,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

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

vi.mock('@/components/ProjectCard', () => ({
  default: ({ project }) => (
    <a href={`/project/${project.id}`}>{project.title}</a>
  ),
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

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

  it('shows every project linked to the opportunity', () => {
    render(
      <Program
        program={program}
        projects={[
          { id: 'p1', title: 'First Project' },
          { id: 'p2', title: 'Second Project' },
        ]}
      />
    )

    expect(
      screen.getByRole('heading', {
        name: 'opportunities.student_projects',
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'First Project' })
    ).toHaveAttribute('href', '/project/p1')
    expect(
      screen.getByRole('link', { name: 'Second Project' })
    ).toHaveAttribute('href', '/project/p2')
    expect(
      screen.getByRole('link', {
        name: 'opportunities.add_project',
      })
    ).toHaveAttribute(
      'href',
      '/project/create?opportunity=research-week'
    )
  })

  it('loads every additional project page on request', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        projects: [{ id: 'p2', title: 'Second Project' }],
        nextCursor: null,
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    render(
      <Program
        program={program}
        projects={[{ id: 'p1', title: 'First Project' }]}
        projectCursor="p1"
      />
    )

    await user.click(
      screen.getByRole('button', {
        name: 'opportunities.load_more_projects',
      })
    )

    expect(
      await screen.findByRole('link', {
        name: 'Second Project',
      })
    ).toHaveAttribute('href', '/project/p2')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/program-projects?opportunity=research-week&cursor=p1'
    )
    expect(
      screen.queryByRole('button', {
        name: 'opportunities.load_more_projects',
      })
    ).not.toBeInTheDocument()
  })

  it('shows a useful empty state when no projects are linked', () => {
    render(<Program program={program} />)

    expect(
      screen.getByText(
        'opportunities.student_projects_empty'
      )
    ).toBeInTheDocument()
  })

  it('links an in-person location to Google Maps', () => {
    render(<Program program={program} />)

    expect(
      screen.getByRole('link', { name: 'Cambridge, MA' })
    ).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=Cambridge%2C%20MA'
    )
  })

  it.each(['Virtual', 'Multiple Locations', 'Unsure'])(
    'does not link the non-geographic location %s to Google Maps',
    (location) => {
      render(
        <Program
          program={{
            ...program,
            location,
          }}
        />
      )

      expect(
        screen.queryByRole('link', { name: location })
      ).not.toBeInTheDocument()
    }
  )

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
