// Classroom estimation factors, deliberately fixed; not market exchange rates.
export const currencies = [
  { code: 'JPY', name: '일본 엔', rate: 10, countries: ['JP'] },
  { code: 'CNY', name: '중국 위안', rate: 200, countries: ['CN'] },
  { code: 'USD', name: '미국 달러', rate: 1400, countries: ['US'] },
  {
    code: 'EUR',
    name: '유로',
    rate: 1500,
    countries: [
      'FR',
      'DE',
      'IT',
      'ES',
      'PT',
      'NL',
      'BE',
      'AT',
      'IE',
      'FI',
      'GR',
      'LU',
      'MT',
      'CY',
      'SK',
      'SI',
      'EE',
      'LV',
      'LT',
      'HR',
    ],
  },
  { code: 'GBP', name: '영국 파운드', rate: 1800, countries: ['GB'] },
  { code: 'AUD', name: '호주 달러', rate: 900, countries: ['AU'] },
  { code: 'CAD', name: '캐나다 달러', rate: 1000, countries: ['CA'] },
  { code: 'CHF', name: '스위스 프랑', rate: 1600, countries: ['CH', 'LI'] },
  { code: 'HKD', name: '홍콩 달러', rate: 180, countries: ['HK'] },
  { code: 'THB', name: '태국 바트', rate: 40, countries: ['TH'] },
]
export const defaultCurrency = (country: string) =>
  currencies.find((c) => c.countries.includes(country))?.code ?? ''
export const MAX_COST = 1_000_000_000
export function estimateWon(amount: string, code: string): number | null {
  const currency = currencies.find((c) => c.code === code)
  if (!currency || !/^\d+(\.\d{1,2})?$/.test(amount.trim())) return null
  const value = Math.round(Number(amount) * currency.rate)
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_COST ? value : null
}
