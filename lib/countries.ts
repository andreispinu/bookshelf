import { getNames, getData } from 'country-list'

// Overrides for ISO names that are too verbose or unusual for a user-facing dropdown
const OVERRIDES: Record<string, string> = {
  'Bolivia (Plurinational State of)': 'Bolivia',
  'Bonaire, Sint Eustatius and Saba': 'Bonaire',
  'British Indian Ocean Territory (the)': 'British Indian Ocean Territory',
  'Bahamas (The)': 'Bahamas',
  'Cayman Islands (the)': 'Cayman Islands',
  'Central African Republic (the)': 'Central African Republic',
  'Cocos (Keeling) Islands (the)': 'Cocos Islands',
  'Comoros (the)': 'Comoros',
  'Congo (the Democratic Republic of the)': 'DR Congo',
  'Congo (the)': 'Republic of Congo',
  'Cook Islands (the)': 'Cook Islands',
  'Dominican Republic (the)': 'Dominican Republic',
  'Falkland Islands (the) [Malvinas]': 'Falkland Islands',
  'Faroe Islands (the)': 'Faroe Islands',
  'French Southern Territories (the)': 'French Southern Territories',
  'Gambia (the)': 'Gambia',
  'Holy See (the)': 'Vatican City',
  'Iran (Islamic Republic of)': 'Iran',
  "Korea (the Democratic People's Republic of)": 'North Korea',
  'Korea (the Republic of)': 'South Korea',
  "Lao People's Democratic Republic (the)": 'Laos',
  'Marshall Islands (the)': 'Marshall Islands',
  'Micronesia (Federated States of)': 'Micronesia',
  'Moldova (the Republic of)': 'Moldova',
  'Netherlands (Kingdom of the)': 'Netherlands',
  'Niger (the)': 'Niger',
  'Northern Mariana Islands (the)': 'Northern Mariana Islands',
  'Palestine, State of': 'Palestine',
  'Philippines (the)': 'Philippines',
  'Russian Federation (the)': 'Russia',
  'Saint Helena, Ascension and Tristan da Cunha': 'Saint Helena',
  'Sudan (the)': 'Sudan',
  'Syrian Arab Republic (the)': 'Syria',
  'Taiwan (Province of China)': 'Taiwan',
  'Tanzania, the United Republic of': 'Tanzania',
  'Turks and Caicos Islands (the)': 'Turks and Caicos Islands',
  'United Arab Emirates (the)': 'United Arab Emirates',
  'United Kingdom of Great Britain and Northern Ireland (the)': 'United Kingdom',
  'United States Minor Outlying Islands (the)': 'US Minor Outlying Islands',
  'United States of America (the)': 'United States',
  'Venezuela (Bolivarian Republic of)': 'Venezuela',
  'Virgin Islands (British)': 'British Virgin Islands',
  'Virgin Islands (U.S.)': 'US Virgin Islands',
}

export const COUNTRIES: string[] = getNames()
  .map(name => OVERRIDES[name] ?? name)
  .sort((a, b) => a.localeCompare(b))

// Convert ISO 3166-1 alpha-2 code to flag emoji
function codeToFlag(code: string): string {
  return Array.from(code.toUpperCase())
    .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('')
}

// Map from clean country name → flag emoji
export const COUNTRY_FLAGS: Record<string, string> = Object.fromEntries(
  getData().map(({ code, name }) => [OVERRIDES[name] ?? name, codeToFlag(code)])
)
