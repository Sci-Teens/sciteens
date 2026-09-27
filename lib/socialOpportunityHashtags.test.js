import { describe, expect, it } from 'vitest'

import { opportunityHashtags } from './socialOpportunityHashtags.mjs'

const michigan = {
  locationState: 'MI',
  gradeRangeLow: 9,
  gradeRangeHigh: 12,
  fields: ['Computer Science'],
  programType: 'Summer Program',
}

describe('opportunityHashtags', () => {
  it('avoids interpreting foreign state abbreviations as US states', () => {
    const tags = opportunityHashtags(
      [{ ...michigan, locationCountry: 'Italy' }],
      'instagram'
    )
    expect(
      tags.some((tag) => tag.includes('Michigan'))
    ).toBe(false)
  })

  it('targets known state, grades, subject, and program type', () => {
    expect(
      opportunityHashtags([michigan], 'instagram')
    ).toEqual([
      '#MichiganHighSchoolProgram',
      '#ComputerSciencePrograms',
      '#SummerPrograms',
      '#SciTeens',
    ])
    expect(
      opportunityHashtags([michigan], 'facebook')
    ).toEqual([
      '#MichiganHighSchoolProgram',
      '#ComputerSciencePrograms',
    ])
  })

  it('normalizes full state names and intersects known grade ranges', () => {
    expect(
      opportunityHashtags(
        [
          {
            ...michigan,
            locationState: ' michigan ',
            gradeRangeLow: 8,
            gradeRangeHigh: 10,
          },
        ],
        'instagram'
      )[0]
    ).toBe('#MichiganHighSchoolProgram')
  })

  it.each([
    [null, null],
    [8, 8],
    [13, 16],
    [12, 9],
    ['9', '12'],
    [-1, 12],
    [9, Infinity],
  ])(
    'does not claim high-school eligibility for %s through %s',
    (low, high) => {
      expect(
        opportunityHashtags(
          [
            {
              ...michigan,
              gradeRangeLow: low,
              gradeRangeHigh: high,
            },
          ],
          'instagram'
        )[0]
      ).toBe('#MichiganStudentPrograms')
    }
  )

  it.each(['Virtual', ' online ', 'REMOTE'])(
    'omits stale geography for %s programs',
    (location) => {
      const tags = opportunityHashtags(
        [{ ...michigan, location }],
        'instagram'
      )
      expect(
        tags.some((tag) => tag.includes('Michigan'))
      ).toBe(false)
      expect(tags).toContain('#ComputerSciencePrograms')
    }
  )

  it('omits geography for online courses', () => {
    expect(
      opportunityHashtags(
        [{ ...michigan, programType: 'Online Course' }],
        'instagram'
      )
    ).toEqual([
      '#ComputerSciencePrograms',
      '#OnlineCourses',
      '#SciTeens',
    ])
  })

  it('does not infer tags from titles, prose, or malformed metadata', () => {
    expect(
      opportunityHashtags(
        [
          null,
          {
            name: 'Michigan Physics Research Camp',
            about: 'Biology research',
            location: 'Michigan',
            locationState: '<script>',
            fields: ['Research', 'STEM', null, {}],
            programType: 'Other',
          },
          { fields: 'Biology' },
        ],
        'instagram'
      )
    ).toEqual(['#StudentOpportunities', '#SciTeens'])
    expect(opportunityHashtags(null, 'facebook')).toEqual([
      '#StudentOpportunities',
      '#SciTeens',
    ])
  })

  it('balances categories and ranks shared tags first without counting duplicate fields', () => {
    const entries = [
      {
        ...michigan,
        fields: [
          'Computer Science',
          'Computer Science',
          'Computer Science',
        ],
      },
      {
        locationState: 'NY',
        fields: ['Biology'],
        programType: 'Internship',
      },
      {
        locationState: 'New York',
        fields: ['Biology'],
        programType: 'Scholarship',
      },
    ]
    const tags = opportunityHashtags(entries, 'instagram')
    expect(tags).toEqual([
      '#NewYorkStudentPrograms',
      '#BiologyPrograms',
      '#SummerPrograms',
      '#MichiganHighSchoolProgram',
      '#ComputerSciencePrograms',
    ])
    expect(
      opportunityHashtags(entries, 'facebook')
    ).toEqual(tags.slice(0, 2))
    expect(
      opportunityHashtags(entries, 'instagram')
    ).toEqual(tags)
    expect(new Set(tags).size).toBe(tags.length)
  })
})
