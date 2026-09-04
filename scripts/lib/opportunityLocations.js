'use strict'

const CITY_KEYS = [
  'city',
  'town',
  'village',
  'municipality',
  'hamlet',
]

function cleanComponent(value) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function firstAddressComponent(address, keys) {
  for (const key of keys) {
    const value = cleanComponent(address[key])
    if (value) return value
  }
  return null
}

function locationComponentsFromNominatim(result) {
  const address =
    result?.address && typeof result.address === 'object'
      ? result.address
      : {}

  return {
    locationCity: firstAddressComponent(address, CITY_KEYS),
    locationState: firstAddressComponent(address, [
      'state',
      'state_district',
    ]),
    locationPostalCode: cleanComponent(address.postcode),
    locationCountry: cleanComponent(address.country),
  }
}

module.exports = { locationComponentsFromNominatim }
