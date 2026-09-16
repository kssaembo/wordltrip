import { it, expect } from 'vitest'
import { currencies, defaultCurrency, estimateWon } from '../src/lib/exchange'

it('10개 고정 화폐를 지원하고 해당 국가의 화폐만 기본 선택한다', () => {
  expect(currencies).toHaveLength(10)
  expect(defaultCurrency('JP')).toBe('JPY')
  expect(defaultCurrency('FR')).toBe('EUR')
  expect(defaultCurrency('BR')).toBe('')
})
it('엔은 10배로 계산하고 모든 결과는 정수 원화로 반올림한다', () => {
  expect(estimateWon('1000', 'JPY')).toBe(10000)
  expect(estimateWon('12.50', 'USD')).toBe(17500)
  expect(estimateWon('0.01', 'THB')).toBe(0)
  expect(estimateWon('0.02', 'THB')).toBe(1)
  for (const c of currencies) expect(Number.isInteger(estimateWon('12.34', c.code))).toBe(true)
})
it('빈 값·음수·지수표기·지원하지 않는 화폐·비용 한도 초과를 거부한다', () => {
  for (const input of ['', '-1', '1e6', 'Infinity', 'abc', '0.001', '100000001'])
    expect(estimateWon(input, 'JPY')).toBeNull()
  expect(estimateWon('100000000', 'JPY')).toBe(1_000_000_000)
  expect(estimateWon('10', 'BRL')).toBeNull()
})
