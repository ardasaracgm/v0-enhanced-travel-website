// Single source for the nationality / passport-country list, shared by the ferry
// passenger form and the companions form. Values are English-name strings and
// are ALSO the stored value; display labels come from i18n
// (passengerDetails.nationalities.<value>). Keep in sync with those message keys.
export const NATIONALITIES = [
  'Turkey',
  'Germany',
  'United Kingdom',
  'Netherlands',
  'France',
  'Belgium',
  'Austria',
  'Switzerland',
  'Italy',
  'Spain',
  'Greece',
  'United States',
  'Other',
] as const

export type Nationality = (typeof NATIONALITIES)[number]

export const DEFAULT_NATIONALITY: Nationality = 'Turkey'

/** True if `v` is one of the known nationality/country values (server backstop). */
export function isNationality(v: string): v is Nationality {
  return (NATIONALITIES as readonly string[]).includes(v)
}
