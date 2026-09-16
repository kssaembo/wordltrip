import { useState } from 'react'
import { Calculator } from 'lucide-react'
import { currencies, defaultCurrency, estimateWon, MAX_COST } from '../lib/exchange'
import { costFields, money } from '../lib/model'
import type { Destination } from '../lib/model'

export function ExchangeCalculator({
  destination,
  onChange,
}: {
  destination: Destination
  onChange: (d: Destination) => void
}) {
  const [code, setCode] = useState(() => defaultCurrency(destination.country_code))
  const [amount, setAmount] = useState('')
  const [field, setField] = useState<(typeof costFields)[number][0]>('food_cost')
  const [notice, setNotice] = useState('')
  const currency = currencies.find((c) => c.code === code)
  const won = estimateWon(amount, code)
  const overflow = won !== null && destination[field] + won > MAX_COST
  return (
    <details className="exchange-calculator">
      <summary>
        <Calculator size={16} /> 간편 환산기 <small>학습용 고정 환율</small>
      </summary>
      <div className="exchange-body">
        <div className="field-row">
          <label>
            화폐
            <select
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setNotice('')
              }}
            >
              <option value="">화폐를 선택하세요</option>
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </label>
          <label>
            외화 금액
            <input
              type="text"
              inputMode="decimal"
              maxLength={16}
              value={amount}
              placeholder="예: 1000"
              onChange={(e) => {
                setAmount(e.target.value)
                setNotice('')
              }}
            />
          </label>
        </div>
        {currency && (
          <p className="exchange-formula">
            1 {code} = 약 {money(currency.rate)} · 금액 × {currency.rate.toLocaleString('ko-KR')}
          </p>
        )}
        <output aria-live="polite">
          {won === null ? '금액을 입력하면 원화로 계산해요.' : `약 ${money(won)}`}
        </output>
        {amount && currency && won === null && (
          <p className="exchange-warning">
            0 이상의 숫자(소수 둘째 자리까지)를 입력하세요. 환산 결과는 10억 원 이하여야 해요.
          </p>
        )}
        <div className="exchange-apply">
          <label>
            반영할 비용 항목
            <select
              value={field}
              onChange={(e) => {
                setField(e.target.value as typeof field)
                setNotice('')
              }}
            >
              {costFields.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="outline"
            disabled={won === null || won === 0 || overflow}
            onClick={() => {
              if (won === null || won <= 0 || overflow) return
              onChange({ ...destination, [field]: destination[field] + won })
              setNotice(
                `${costFields.find(([key]) => key === field)?.[1]}에 ${money(won)}을 더했어요.`,
              )
              setAmount('')
            }}
          >
            선택한 비용에 더하기
          </button>
        </div>
        {overflow && (
          <p className="exchange-warning">더한 금액이 항목당 한도인 10억 원을 넘어요.</p>
        )}
        {notice && <p role="status">{notice}</p>}
        <p className="exchange-disclaimer">
          정확한 환율 계산이 아닙니다. 편의성을 위해 학습용 고정 환율로 대략 계산하며, 실제 환율과
          다를 수 있어요. 원 미만은 반올림합니다.
        </p>
      </div>
    </details>
  )
}
