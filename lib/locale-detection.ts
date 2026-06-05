const COUNTRY_TO_LOCALE: Record<string, string> = {
  RO: 'ro', MD: 'ro',
  RU: 'ru', BY: 'ru', KZ: 'ru', UA: 'ru', KG: 'ru', TJ: 'ru', TM: 'ru', UZ: 'ru',
  AM: 'ru', AZ: 'ru', GE: 'ru',
}

const VALID_LOCALES = ['en', 'ro', 'ru']

export function detectLocaleFromHeaders(
  countryCode: string | null,
  acceptLanguage: string | null,
): string {
  // 1. Country code from Vercel geo-detection
  if (countryCode) {
    const mapped = COUNTRY_TO_LOCALE[countryCode.toUpperCase()]
    if (mapped) return mapped
  }
  // 2. Accept-Language header — take the first tag's primary subtag
  if (acceptLanguage) {
    const primary = acceptLanguage.split(',')[0].split(';')[0].split('-')[0].trim().toLowerCase()
    if (VALID_LOCALES.includes(primary)) return primary
  }
  // 3. Default
  return 'en'
}
