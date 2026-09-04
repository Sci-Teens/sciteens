import { describe, expect, it } from 'vitest'

const {
  locationComponentsFromNominatim,
} = require('./opportunityLocations')

describe('locationComponentsFromNominatim', () => {
  it('extracts searchable city, state, postal code, and country fields', () => {
    expect(
      locationComponentsFromNominatim({
        address: {
          town: 'Rolla',
          state: 'Missouri',
          postcode: '65401',
          country: 'United States',
        },
      })
    ).toEqual({
      locationCity: 'Rolla',
      locationState: 'Missouri',
      locationPostalCode: '65401',
      locationCountry: 'United States',
    })
  })

  it('uses a locality fallback and returns null for missing components', () => {
    expect(
      locationComponentsFromNominatim({
        address: {
          village: 'La Jolla',
          state: 'California',
          country: 'United States',
        },
      })
    ).toEqual({
      locationCity: 'La Jolla',
      locationState: 'California',
      locationPostalCode: null,
      locationCountry: 'United States',
    })
  })
})
